var udp = require('dgram');

class SocketUDP {

    constructor(mode, ip_src, port_src, ip_dst, port_dst, ready_callback, function_callback) {
        // Funcion invocada en la instanciación
        // de la clase

        this.mode = mode;
        this.ip_src = ip_src;
        this.ip_dst = ip_dst;
        this.port_src = port_src;
        this.port_dst = port_dst;

        this.server = null;
        this.connected = false;
        this.ready = false;

        this.ready_callback = ready_callback;
        this.function_callback = function_callback;

        this.connect = function() {

            this.socket = udp.createSocket('udp4');
            // Comun para server y client

            if (mode) {
                // Servidor
                this.set_listener();
            } else {
                // Cliente
            }
            
        }
        this.connect();
    }

    receive_msg() {
        this.socket.on('message', function(msg, info) {
            console.log(msg.toString());
            // console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);
        });
    }

    send_message(msg, namespace="/") {
        //(IP_FPGA, PORT_FPGA)
        msg = new Uint8Array(msg);

        this.socket.send(msg, 0, msg.length, this.port_dst, this.ip_dst); // Envio el mensaje.  
    }
    
    set_listener() {
        this.socket.bind(this.port_src, this.ip_src);
        //-------------------------------------------------------------------
        //       Servicio que procesa los mensajes recibidos de la FPGA      
        //-------------------------------------------------------------------
        this.socket.on('message', (msg, rinfo) => {  //funcion derecepcion de mensajes.
            //msg es del tipo 'Buffer'
            //rinfo posee la ip de origen, el puerto de origen, tipo de conexion, longitud de los datos. 

            this.function_callback(msg)
           
        });
        this.socket.on('error', (err) => {   //en el caso que no se abra el socket o cualquier error.
            this.socket.close();
        });
        this.socket.on('connect', (stream) => {
            this.ready_callback();
        });
    }

}

module.exports = SocketUDP;