# Solar IOT calculator

A python flask based web application to estimate system uptime of self-sufficient IOT
system. The app was originally designed with solar panels and liion batteries in mind.

## dependencies
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

<footer class="footer">
<div class="container">
<span class="text-muted">
	Solar IOT calculator uses:
	<a href="https://ec.europa.eu/jrc/en/PVGIS/docs/noninteractive" target="_blank">PVGIS API</a>,
	<a href="https://nominatim.org/release-docs/develop/api/Search/" target="_blank">Nominatim</a>,
	<a href="https://leafletjs.com/reference-1.7.1.html" target="_blank">Leafletjs</a>,
	<a href="https://www.openstreetmap.org" target="_blank">Openstreetmap</a>
</span>
</div>
</footer>
