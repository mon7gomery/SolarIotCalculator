# Solar IOT calculator

A quick&dirty python flask based web application to estimate system availability of self-sufficient IOT
systems. The app was originally designed with solar panels and LiIon batteries in mind. Other energy harvesting techs would be interesting, too.

Thanks to [pythonanywhere](https://www.pythonanywhere.com) this [demo](http://solariotcalc.pythonanywhere.com/) can be hosted for free :)

## Development/self-hosted

### system 
```bash
apt install python3-venv python3-pip
```

### python

To create an python3 virtual environment and install all dependecies run:

```bash
make install
```

## start flask webserver

```bash
make run
```

## refs
This app uses the following services:

[OpenStreetMaps](https://www.openstreetmap.org)
[Nominatim Geocoding](https://nominatim.org/release-docs/develop/api/Search/)
[PVGIS API](https://joint-research-centre.ec.europa.eu/pvgis-photovoltaic-geographical-information-system/getting-started-pvgis/api-non-interactive-service_en)