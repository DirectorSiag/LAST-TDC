"""
Este archivo contiene las funciones de comunicacion
necesarias para vincularse con la aplicación en Electron
que levanta la interfaz del radar.
"""

import socketio
import time

class SocketCom():
    """
    Establece una comunicacion por sockets.
    """
    def __init__(self, port, namespaces):
        self.PORT = port
        self._last_message = None
        self.sioGeneral = socketio.Client()
        self.SLEEP_TIME = 0.1
        self.namespaces = namespaces
        self.read_callback = None
        self._init()

    def _init(self):
        """
        Inicializa la comunicacion en el localhost.
        """
        self.sioGeneral.connect(f'http://localhost:{self.PORT}', namespaces=self.namespaces)
        self.sioGeneral.on("disconnect", self.disconnected)
        self.sioGeneral.on("message", self.message)

        for namespace in self.namespaces:
            self.sioGeneral.on("disconnect", lambda namespace=namespace: self.disconnected(namespace), namespace=namespace)
            self.sioGeneral.on("message", lambda data, namespace=namespace: self.message(data, namespace), namespace=namespace)

    def disconnect(self):
        """
        Metodo llamado cuando se quiere desconectar el cliente.
        """
        self.sioGeneral.disconnect()

    def disconnected(self, namespace="/"):
        """
        Avisa cuando hay un desconexion del servidor.
        """
        print(f"Puerto {self.PORT}, namespace {namespace} desconectado.")

    def message(self, msg, namespace="/"):
        """
        Recibe un mensaje y lo guarda en el buffer interno.
        """
        self._last_message = msg
        
        if self.read_callback != None:
            self.read_callback(msg, namespace)

    def send_message(self, message, namespace='/'):
        """
        Envia un mensaje, usando el namespace pasado como
        parametro, o el namespace por defecto en su ausencia.
        """
        self.sioGeneral.emit('message', message, namespace=namespace)

    def new_message(self):
        """
        Retorna True si hay algo en el buffer, False
        si no lo hay.
        """
        if self._last_message == None:
            return False
        else:
            return True

    def empty_buffer(self):
        """
        Vacia la variable que almacena el ultimo mensaje.
        """
        self._last_message = None

    def get_received(self):
        """
        Devuelve el ultimo contenido recibido y vacia el buffer.
        """
        aux = self._last_message
        self._last_message = None
        return aux

    def wait_to_receive(self):
        """
        Se queda esperando a recibir un dato, y lo devuelve.
        """
        while not(self.new_message()):
            time.sleep(self.SLEEP_TIME)

        # Aca ya recibio un dato
        return self.get_received()

    def send_and_receive(self, message):
        """
        Envía un mensaje y se queda esperando a una
        respuesta para devolverla.
        """
        self.send_message(message)

        return self.wait_to_receive()

    def set_callback(self, callback):
        self.read_callback = callback
