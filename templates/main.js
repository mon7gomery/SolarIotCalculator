/**
 * 
 *  Solar IOT calculator
 *  @file main.js
 * 
 */

/* globals */
var version_string = "0.3";
var app_name_version = "Solar IOT calculator V" + version_string;

_DEBUG_ = false;

gLat = 52.2893504;
gLon = 12.8284827;

var marker;
var map;
/* END:globals */


// document ready handler
$( document ).ready(function() {
    $("#app-name-version").text(app_name_version);
    $("#input-location-search").val("");
    resetUI();
    createMap();
    initUI();
    predict();

});

// Location search handler
$("#input-location-search").on("change", function() {

    $('#status-location-updated').hide();

    var payload = new Object()
    payload.address = JSON.stringify($('#input-location-search').val());

    if (_DEBUG_) console.log(JSON.stringify(payload));

    $.ajax({
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        dataType: 'json',
        url: "api/v1/get/location",
        async: false,   // wait for result to update prediction
        success: function (data) {
            $('#search-results').empty();
            if (data.length)
            {
                updateMap(data[0].lat, data[0].lon);
                $.each(data,function(i,data){
                    $('#search-results').append('<a class="dropdown-item" onclick="updateMap('+ data.lat +','+ data.lon+ ');">' + data.display_name + '</a>'); 
                });

                if (_DEBUG_) console.log(data);
            }
            else
            {
                // No search results
                $('#status-location-error').show();
                setTimeout(status_location_error, 5000);
            }
        },
        error: function (request, error) {
            console.log(arguments);
            console.log(error);
        },
      });

      predict();

});

// add new task card
$( "#newTask" ).click(function() {
    $( "#tasks" ).append( createNewTaskCard() );
});

// prediction form submit handler
$(document).on('submit','#systemparams',function(e){

    e.preventDefault();
    resetUI();

    predict();
});



/******************************************************************************
    UI helper
******************************************************************************/
function initUI()
{
    // update map position
    map.panTo(new L.LatLng(gLat, gLon));
    marker = L.marker([gLat, gLon]).addTo(map);

    // update system parameters form
    $('#lat').val(gLat);
    $('#lon').val(gLon);
}

function resetUI()
{
    // remove bat alerts
    $('#batfine').hide();
    $('#batwarning').hide();
    $('#batdanger').hide();

    // remove status alerts
    $('#status-location-updated').hide();
    $('#status-location-error').hide();

    // clear graphs
    $("#battery-soc-chart").text('');
    $("#relative-empty-days-chart").text('');
}
/******************************************************************************
END: UI helper
******************************************************************************/


/******************************************************************************
    MAP 
******************************************************************************/
function createMap()
{
    // Creating map options
    var mapOptions = {
        center: [gLat, gLon],
        zoom: 10
    }

    // Creating a map object
    map = new L.map('map', mapOptions);

    // Creating a Layer object
    var layer = new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        subdomains: 'abc'
        }).addTo(map)

    // Adding layer to the map
    map.addLayer(layer);

    // disable user interaction
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();

}

function updateMap(lat, lon)
{
    gLat = lat;
    gLon = lon;

    map.removeLayer(marker)
    map.panTo(new L.LatLng(gLat, gLon));
    marker = L.marker([gLat, gLon]).addTo(map);

    // round lat and lon to 0.12345 precision
    gLat = Math.round(gLat * 100000) / 100000;
    console.log(gLat);
    gLon = Math.round(gLon * 100000) / 100000;
    console.log(gLon);

    // update system parameters form
    $('#lat').val(gLat);
    $('#lon').val(gLon);

    // update status msg
    $('#status-location-updated').show();
    $('#assumptions').hide();
    setTimeout(status_location_updated, 5000);
}

function status_location_updated()
{
    $('#status-location-updated').hide();
    console.log('location updated'); // Your code goes here
}

function status_location_error()
{
    $('#status-location-error').hide();
    console.log('no search results'); // Your code goes here
}
/******************************************************************************
END:    MAP 
******************************************************************************/


/******************************************************************************
    TASK CARDS 
******************************************************************************/
function createNewTaskCard()
{
    // create UUID for task cards to e.g. delete them later on ??
    var task_card_html =    '<div class="card col-md-3"> \
                                <div class="card-body"> \
                                    <h5 class="card-title">Task</h5> \
                                        <small>name</small> \
                                        <input name="taskname" type="text" class="form-control" value="taskname" required> \
                                        <small>current [mA]</small> \
                                        <input name="current" type="number" step="0.001" class="form-control" id="current" value="0.2" required> \
                                        <small>duration [S]</small> \
                                        <input name="duration" type="number" step="0.001" class="form-control" id="duration" value="0.2" required> \
                                        <button class="btn btn-primary" disabled hidden>Remove</button> \
                                </div> \
                            </div>'

    /*
    $('<div/>', {
        'id':'myDiv',
        'class':'myClass',
        'text':'Text Only',
    }).on('click', function(){
        alert(this.id); // myDiv
    }).appendTo('#tasks');
    */

    return task_card_html;
}

function removeTaskCard(task_id)
{
    // TODO: needed? -> implement
    // search form for task id card and remove it
}
/******************************************************************************
END:    TASK CARDS 
******************************************************************************/



/******************************************************************************
    OFF GRID PREDICTION
******************************************************************************/
function predict()
{
    $.ajax({
        type: "POST",
        contentType: 'application/json',
        data: JSON.stringify(getSystemParamsDict()),
        dataType: 'json',
        url: "/api/v1/get/offgirdprediction",
        success: function (data) {
          updatePercentageEmptyAlert(data["outputs"]["totals"]["f_e"], data["average_current"]);
          updateSocChart(data["outputs"]["histogram"]);
          updateBatEmptyChart(data["outputs"]["monthly"]);
          if (_DEBUG_) console.log(data);
        }
      });
}

/* convert system parameters form to dictionary */
// assumption: params first, all task cards in the end
// all system params have it's own key
// all tasks with their params are stored in a seperate array in the end
function getSystemParamsDict()
{
    var serialized_array = $('#systemparams').serializeArray();
    var form_dict = {};
    var tasks_array = [];
    var task_dict = {};
    var i = 0;

    // loop through form
    // append all system params
    // create array of tasks
    while (i < serialized_array.length)
    {
        if (serialized_array[i]['name'] != 'taskname')
        {
            // add everything which is not part of an task
            form_dict[serialized_array[i]['name']] = serialized_array[i++]['value'];
        }
        else
        {
            // new task found
            task_dict[serialized_array[i]['name']] = serialized_array[i++]['value']; // add name
            while (serialized_array[i]['name'] != 'taskname')
            {
                // add all task params
                task_dict[serialized_array[i]['name']] = serialized_array[i++]['value'];
                if (i >= serialized_array.length) break;
            }
            // add new task dict to tasks array
            tasks_array.push(task_dict);
            task_dict = {};
        }
    }

    form_dict['tasks'] = tasks_array;

    if (_DEBUG_) console.log(form_dict);
    
    return form_dict;
}

// prediction alert and chart related
function updatePercentageEmptyAlert(percentage, average_current)
{
    var days = 365 * percentage / 100;
    days = Math.round(days * 100) / 100
    // hide all alerts
    $('#batfine').hide();
    $('#batwarning').hide();
    $('#batdanger').hide();

    average_current = Math.floor(average_current * 1000)/1000;

    if (percentage == 0)
    {
        $('#emptydays-fine').html(percentage+"% ("+ days +"days)");
        $('#avg-current-fine').html(average_current + "mA");
        $('#batfine').show();
    }
    else if (percentage < 5)
    {
        $('#emptydays-warning').html(percentage+"% ("+ days +"days)");
        $('#avg-current-warning').html(average_current + "mA");
        $('#batwarning').show();
    }
    else
    {
        $('#emptydays-danger').html(percentage+"% ("+ days +"days)");
        $('#avg-current-danger').html(average_current + "mA");
        $('#batdanger').show();
    }

}

function updateSocChart(histogram_obj)
{
    var histogram_data = [];
    var histogram_legend = [];

    $.each(histogram_obj, function(key, value) {
        histogram_data[key] = [key, value["f_CS"]];
        histogram_legend[key] = [key+0.4, value["CS_min"]+"-"+value["CS_max"]];
    });
    
    var dataset = [
        { label: "Battery state of charge", data: histogram_data, color: "#5482FF" }
    ];
    
    var options = {
        series: {
            bars: {
                show: true
            }
        },
        bars: {
            align: "center",
            barWidth: 0.5
        },
        xaxis: {
            axisLabel: "Stage of charge bins",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 12,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 10,
            ticks: histogram_legend
        },
        yaxis: {
            axisLabel: "fraction of the year",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 12,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            tickFormatter: function (v, axis) {
                return Math.round(v * 10) / 10 + "%";
            }
        },
        legend: {
            noColumns: 1,
            labelBoxBorderColor: "#000000",
            position: "nw"
        },
        grid: {
            hoverable: true,
            borderWidth: 2,
            backgroundColor: { colors: ["#ffffff", "#EDF5FF"] }
        }
    };

    $.plot($("#battery-soc-chart"), dataset, options);
}

function updateBatEmptyChart(monthly_obj)
{
    var monthly_data_full = [];
    var monthly_data_empty = [];
    var monthly_legend = 
    [
        [0, "Jan"],
        [1, "Feb"],
        [2, "Mar"],
        [3, "Apr"],
        [4, "May"],
        [5, "Jun"],
        [6, "Jul"],
        [7, "Aug"],
        [8, "Sep"],
        [9, "Oct"],
        [10, "Nov"],
        [11, "Dec"],
    ];

    $.each(monthly_obj, function(key, value) {
        monthly_data_full[key] = [key, value["f_e"]];
    });
    
    var dataset = [
        { label: "Battery state of charge", data: monthly_data_full, color: "#A00" }
    ];
    
    var options = {
        series: {
            bars: {
                show: true
            }
        },
        bars: {
            align: "center",
            barWidth: 0.5,
        },
        xaxis: {
            axisLabel: "Month",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 12,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 10,
            ticks: monthly_legend,
        },
        yaxis: {
            axisLabel: "fraction of month with empty bat",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 12,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            tickFormatter: function (v, axis) {
                return Math.round(v * 10) / 10 + "%";
            }
        },
        legend: {
            noColumns: 1,
            labelBoxBorderColor: "#000000",
            position: "nw"
        },
        grid: {
            hoverable: true,
            borderWidth: 2,
            backgroundColor: { colors: ["#ffffff", "#EDF5FF"] }
        }
    };

    $.plot($("#relative-empty-days-chart"), dataset, options);
}
/******************************************************************************
END:    OFF GRID PREDICTION
******************************************************************************/