SHELL := /bin/bash

run:
	# start flask development webserver
	source ./.venv3/bin/activate; \
	export FLASK_APP=serv; \
	export FLASK_DEBUG=1; \
	flask run --cert=adhoc;
	
install:
	# sudo apt install python3 python3-venv
	python3 -m venv .venv3
	source ./.venv3/bin/activate; \
  	pip3 install -r requirements.txt \
	
	
 	
