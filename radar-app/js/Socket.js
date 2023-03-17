const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const io_client = require("socket.io-client");

class Socket {

    constructor(ip, socket_port, mode, namespaces, read_callback) {
        /*
        Explicacion parametros

        ip: IP de la maquina a conectar
        socket_port: Puerto/s relacionado
        mode: 1 para servidor, 0 para client
        namespaces: Lista de namespaces a crear
        function_callback_general: Funcion invocada cada vez que se recibe un dato
        */
        this.IP_HOST = ip;
        this.PORT_HOST = socket_port;
        this.namespaces = namespaces;
        this.msg_identifier = "message";
        this.sockets = {};
        this.read_callback = read_callback;

        this.connect = function() {

            if (mode) {
                // Server Mode
                this.server_mode();
            } else {
                // Client Mode
                this.client_mode();
            }
        }

        this.server_mode = function() {
            var $this = this;

            var aux_socket = io.attach(this.PORT_HOST, {'host': this.IP_HOST});
            this.sockets = {};

            console.log("Servidor corriendo en " + this.IP_HOST + ":" + this.PORT_HOST);

            aux_socket.on('connection', function(socket) {
                $this.sockets["/"] = socket;
                // Reasignacion de la variable socket con la actualizacion de la conexion

                console.log("Cliente conectado, puerto: " + $this.PORT_HOST);

                $this.send_message("ACK");
                // Envia un ACK de confirmacion

                socket.on($this.msg_identifier, function(data) {
                    $this.read_callback(data, "/");
                });

                socket.on('disconnect', function() {
                    // Cuando se desconecta el cliente, se
                    // maneja en esta funcion.
                    console.log("Cliente desconectado.");
                });
            });

            let namespaces = this.namespaces;

            // Abro los canales internos.
            for(let j = 0; j < namespaces.length; j++) {
                let namespace_name = namespaces[j];

                var aux_socket = io.of("/" + namespace_name);

                aux_socket.on("connection", function(socket) {
                    console.log("Namespace " + namespace_name + " conectado, en puerto " + $this.PORT_HOST + ".");

                    $this.sockets[namespace_name] = socket;
                    // Reasignacion de la variable socket con la actualizacion de la conexion

                    $this.sockets[namespace_name] = socket;
                    // Reasignacion de la variable socket con la actualizacion de la conexion

                    socket.on($this.msg_identifier, function(data) {
                        $this.read_callback(data, namespace_name);
                    });
                    socket.on('disconnect', function() {
                        // Cuando se desconecta el cliente, se maneja en esta funcion.
                        console.log("Namespace " + namespace_name + " desconectado, en puerto " + $this.PORT_HOST + ".");
                    });
                });
            }
        }
        
        this.client_mode = function() {
            var $this = this;

            let url = "http://" + this.IP_HOST + ":" + this.PORT_HOST;

            this.sockets = {
                "/": io_client.connect(url, {reconnect: false})
            };
            this.send_message("ACK");

            this.sockets["/"].on('connect', function() {
                console.log("Cliente conectado a servidor en " + url);

                $this.sockets["/"].on($this.msg_identifier, function(data) {
                    $this.read_callback(data, "/");
                });

                $this.sockets["/"].on('disconnect', function(data) {
                    // Data recibida: transport close
                    console.log("Servidor desconectado del puerto ", $this.PORT_HOST);
                });
            });

            let namespaces = this.namespaces;

            // Abro los canales internos.
            for(let j = 0; j < namespaces.length; j++) {
                let namespace_name = namespaces[j];

                this.sockets[namespace_name] = io_client.connect(
                    url + "/" + namespace_name,
                    {reconnect: false}
                );

                this.sockets[namespace_name].on("connect", function() {
                    console.log("Namespace " + namespace_name + " conectado, en puerto " + $this.PORT_HOST + ".");

                    $this.sockets[namespace_name].on($this.msg_identifier, function(data) {
                        $this.read_callback(data, namespace_name);
                    });
                    $this.sockets[namespace_name].on('disconnect', function() {
                        // Cuando se desconecta el cliente, se
                        // maneja en esta funcion.
                        console.log("Namespace " + namespace_name + " desconectado, en puerto " + $this.PORT_HOST + ".");
                    });
                });
            }
    
        }

        this.connect();
    }

    send_message(msg, namespace="/") {
        if (this.is_connected(namespace))
            this.sockets[namespace].emit(this.msg_identifier, msg);
    }

    is_connected(namespace="/") {
        var connected;

        try {
            connected = this.sockets[namespace].connected;
        } catch (error) {
            console.log(namespace + " en puerto " + this.PORT_HOST + " no conectado.");
            connected = false;
        }

        return connected;
    }
}

module.exports = Socket;
