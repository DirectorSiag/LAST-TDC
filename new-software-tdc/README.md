# software-tdc

Ultima version del software TDC, que incluye radar en Electron y panel de controles en Python.

## Preparacion del entorno

El proyecto está compuesto por dos carpetas, "radar-app", que incluye la aplicación en la plataforma Electron, y "software-tdc", que
compone el panel de controles en Python.

### Pasos a seguir

1. Desde consola, ingresar a la carpeta del proyecto: `cd last-tdc`.
2. Primeramente, configuramos el entorno en Electron:
3. cd `radar-app`.
4. Instalamos Electron `npm install electron --save-dev`.
5. Reinstalamos la dependencia del cliente de socket.io, porque suele causar problemas `npm install -i socket.io-client`.
6. Salimos hacia la carpeta raiz `cd ..`.
7. Continuamos, configurando el entorno en Python:
8. Ingresamos a la carpeta software-tdc: `cd software-tdc`.
9. Es recomendable emplear un entorno virtual, para lo cual corremos: `python -m virtualenv .`.
10. Instalamos las dependencias: `pip install -r requirements.txt`.
11. Volvamos a la carpeta raiz: `cd ..`.
12. Corremos el software con: `./TDC(last).bat` o `./TDC(last).sh`, según si es Windows o Linux.