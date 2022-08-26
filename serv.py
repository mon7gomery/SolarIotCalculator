from flask import Flask, request, render_template, jsonify, json, abort
from fuzzywuzzy import fuzz
from dotenv import load_dotenv
import os, hmac, hashlib, git, requests

SOLAR_API_BASE = "https://re.jrc.ec.europa.eu/api/SHScalc?outputformat=json"
LOCATION_SEARCH_API_BASE = "https://nominatim.openstreetmap.org/search?format=json"
SYSTEM_VOLATGE = 3.3  # does'nt matter to much as long as there is no dcdc involved
SYSTEM_SAFETY_FAKTOR = 1.0
SOLAR_PANEL_SLOPE = 35  # angle of the solar panel from horizontal plane   

app = Flask(__name__, static_url_path='',static_folder="templates")


'''
 lat: float, lon: float, peakcurrent: mA , capacity: mAh, consumption: mA, cutoff: battery percentage
'''
def solarDatabaseRequest(lat: float, lon: float, slope, azimuth, peakcurrent, capacity, avg_current, cutoff=20):
    # assumption: system uses a linear regulator
    batterysize = capacity * SYSTEM_VOLATGE  # mAh
    peakpower = peakcurrent * SYSTEM_VOLATGE # mW
    consumption_per_day = avg_current * SYSTEM_VOLATGE * 24 * SYSTEM_SAFETY_FAKTOR # consumption mWh; 24h per day; 1.5 as safety factor


    ##TODO: replace slope with a better one for self-sufficient systems (e.g. 35°) and inform the user
    request_string = SOLAR_API_BASE + \
                    "&lat="+ str(lat) + \
                    "&lon=" + str(lon) + \
                    "&peakpower=" + str(peakpower) + \
                    "&batterysize=" + str(batterysize) + \
                    "&consumptionday=" + str(consumption_per_day) + \
                    "&cutoff=" + str(cutoff) + \
                    "&angle=" + str(slope) + \
                    "&aspect=" + str(azimuth)

    print(request_string)
    response = requests.get(request_string)
    json_data = response.json()
    # --- modifiy response here
    return (jsonify(json_data))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/v1/get/location', methods=['POST'])
def getLocation():
    if (request.is_json):
        content = request.get_json()
        searchstring = content["address"]
        request_string = LOCATION_SEARCH_API_BASE+"&q=" + searchstring
        response = requests.get(request_string)

        json_data = response.json()
        # take first entry and reduce respose data -> if the first one is not re right one a more specific search needs to be done
        json_resp = {}
        places = []
        for location in json_data:
            # try to presort the results
            ratio = fuzz.ratio(location["display_name"].lower(),searchstring.lower()) # seems to wrork most of the time :)
            #partial_ratio = fuzz.partial_ratio(location["display_name"].lower(),searchstring.lower())

            if ( ratio > 10 ):
                json_tmp_obj = {}
                json_tmp_obj["display_name"] = location["display_name"]
                json_tmp_obj["lat"] = location["lat"]
                json_tmp_obj["lon"] = location["lon"]
                places.append(json_tmp_obj)
            #    print (str(ratio) +" keeping " + location["display_name"])
            #else:
            #    print (str(ratio) +" removing " + location["display_name"])

        return(jsonify(places),200)
    else:
        return(500)


@app.route('/api/v1/get/offgirdprediction', methods=['POST'])
def getOffGridPrediction():
    if (request.is_json):
        content = request.get_json()
        print(content)

        # get system params
        lat =                   float(content['lat'])
        lon =                   float(content['lon'])
        solar_peak_mA =         float(content['peakcurrent'])
        battery_mAh =           float(content['batcap'])
        #avg_current_mA =        float(content['avgcurrent'])
        bat_cutoff_percentage = float(content["batcutoff"])
        azimuth =               int(content["azimuth"])
        slope   =               35

        # limit input values
        if bat_cutoff_percentage < 1:
            bat_cutoff_percentage = 1

        if battery_mAh < 1:
            battery_mAh = 1

        if solar_peak_mA < 1:
            solar_peak_mA

        # calculate average current consumption
        tasks = content['tasks']
        total_duration = 0
        total_energy = 0
        avg_current_mA = 0

        if tasks:
            for task in tasks:
                total_energy += float(task['current']) * float(task['duration'])   # current in mA, duration in seconds
                total_duration += float(task['duration'])

        if total_duration:
            avg_current_mA = total_energy / total_duration
        else:
            avg_current_mA = 0

        print('Average current consumption: ' + str(avg_current_mA) + 'mA')


        # request system prediction
        prediction = solarDatabaseRequest(  lat,
                                            lon,
                                            slope,
                                            azimuth,
                                            solar_peak_mA,
                                            battery_mAh,
                                            avg_current_mA, 
                                            bat_cutoff_percentage)

        prediction = prediction.get_json()
        prediction["average_current"] = avg_current_mA
        return(jsonify(prediction))
    else:
        return(500) # vs 400?? bad request
    
    
###################################
# autodeploy using git webhooks
###################################

load_dotenv()   # load .env file
w_secret = os.environ['SECRET']  # get SECRET env var
full_path_to_git_repo = os.getcwd() # get parent folder

def is_valid_signature(x_hub_signature, data, private_key):
    hash_algorithm, github_signature = x_hub_signature.split('=', 1)
    algorithm = hashlib.__dict__.get(hash_algorithm)
    encoded_key = bytes(private_key, 'latin-1')
    mac = hmac.new(encoded_key, msg=data, digestmod=algorithm)
    return hmac.compare_digest(mac.hexdigest(), github_signature)

@app.route('/update_server', methods=['POST', 'GET'])
def webhook():
    if request.method != 'POST':
        return 'Wrong request method'
    else:
        abort_code = 418
        # Do initial validations on required headers
        if 'X-Github-Event' not in request.headers:
            abort(abort_code)
        if 'X-Github-Delivery' not in request.headers:
            abort(abort_code)
        if 'X-Hub-Signature' not in request.headers:
            abort(abort_code)
        if not request.is_json:
            abort(abort_code)
        if 'User-Agent' not in request.headers:
            abort(abort_code)
        ua = request.headers.get('User-Agent')
        if not ua.startswith('GitHub-Hookshot/'):
            abort(abort_code)

        event = request.headers.get('X-GitHub-Event')
        if event == "ping":
            return json.dumps({'msg': 'Hi!'})
        if event != "push":
            return json.dumps({'msg': "Wrong event type"})

        x_hub_signature = request.headers.get('X-Hub-Signature')
        # webhook content type should be application/json for request.data to have the payload
        # request.data is empty in case of x-www-form-urlencoded
        if not is_valid_signature(x_hub_signature, request.data, w_secret):
            print('Deploy signature failed: {sig}'.format(sig=x_hub_signature))
            abort(abort_code)

        payload = request.get_json()
        if payload is None:
            print('Deploy payload is empty: {payload}'.format(
                payload=payload))
            abort(abort_code)

        if payload['ref'] != 'refs/heads/main':
            return json.dumps({'msg': 'Not main; ignoring'})

        repo = git.Repo(full_path_to_git_repo)
        origin = repo.remotes.origin

        pull_info = origin.pull()

        if len(pull_info) == 0:
            return json.dumps({'msg': "Didn't pull any information from remote!"})
        if pull_info[0].flags > 128:
            return json.dumps({'msg': "Didn't pull any information from remote!"})

        commit_hash = pull_info[0].commit.hexsha
        build_commit = f'build_commit = "{commit_hash}"'
        print(f'{build_commit}')
        return 'Updated PythonAnywhere server to commit {commit}'.format(commit=commit_hash)
