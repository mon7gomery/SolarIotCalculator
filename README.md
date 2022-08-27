# Solar IOT calculator

A quick&dirty python flask based web application to estimate system availability of self-sufficient IOT
systems. The app was originally designed with solar panels and LiIon batteries in mind. Other energy harvesting techs would be interesting, too.

Thanks to [pythonanywhere](https://www.pythonanywhere.com) this [demo](http://solariotcalc.pythonanywhere.com/) can be hosted for free :)

## development/self-hosting

### system dependencies

```bash
apt install python3-venv python3-pip
```

### python

To create an python3 virtual environment and install all dependencies run:

```bash
make install
```

### start flask web server

```bash
make run
```

## Thanks to

Aadi Bajpai for an example of [github autodeploy](https://medium.com/@aadibajpai/deploying-to-pythonanywhere-via-github-6f967956e664) code using webhooks.

The following services/libs:

[OpenStreetMaps](https://www.openstreetmap.org)

[Nominatim Geocoding](https://nominatim.org/release-docs/develop/api/Search/)

[PVGIS API](https://joint-research-centre.ec.europa.eu/pvgis-photovoltaic-geographical-information-system/getting-started-pvgis/api-non-interactive-service_en)

[Bootstrap](https://getbootstrap.com/)

[jQuery](https://jquery.com/)

[leaflet](https://leafletjs.com/)