- Se implemento el boton SYMB LARGE:
	cuanod no esta presionado, el tamaño de la imagen es el que estaba --> zoom = 0.3
	cuando se preisona, el tamaño de la imagen se duplica --> xoom = 0.6
	-> para modificar estos valores, deben modificarse: * las lineas 960 y 962 de la clase TDC_GUI
							    * la linea 50 de la clase radarwidget (valor de zoom por defecto = 0.3)

- Se eliminaron los botones ROLLING y HANDWHEEL de la interfaz.

- Se agregaron los simbolos faltantes:	- 0000101 (rectangulo)
					- 0001010 (helicoptero)

- Se implemento el boton OFF CENT (L y R) como teclas, los demas quedaron como pulsadores.