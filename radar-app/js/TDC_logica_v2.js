var udp = require('dgram');

class TDClogica {
    /*
    esta es la clase principal, la encargada de implementar la logica de la 
    tactica, y su comunicacion con la FPGA
    */
    constructor(radarInterfaz, socketIO) {
        //this.gui = TDC_GUI()
        //this.gui.show()
        //////console.log("hola");
        //---------variables---------
        this.IP_TDC = '172.16.0.99'
        this.PORT_TDC = 8001
        this.IP_FPGA = '172.16.0.100'
        this.PORT_FPGA = 9000

        this.nro_secuencia = 0      //nro de secuencia propio para los mensajes de estado del CONC
        /*
        this.matriz_vacia1 = np.full((17,32)," ")        //matriz de la AND auxiliar
        this.matriz_vacia2 = np.full((17,32)," ") 
        */
        this.matriz_AND1 = Array(16).fill().map(() => Array(32).fill(" "));//matriz de la AND auxiliar
        this.matriz_AND2 = Array(16).fill().map(() => Array(32).fill(" "));

        this.lista_caracteres_AND = [' ', '!', '"', '#', '$', '%', '&', '´', '(', ')', '*', '+', ',', '-', '.', '/', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?', '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', '|', ']', '°', '_'];

        this.label_selection = false;    //variable booleana que me indica si el Label Selection esta habilitado o no.

        this.lista_AB1 = [];
        this.lista_AB2 = [];
        this.lista_AB3 = [];
        this.graficar_LPD = false;

        //variables auxiliares para reenviar el estado del DCL CONC hasta recibir el ACK de la FPGA   
        this.tiempo_reenvio_estado_conc = 0.2;     //reenvio el estado del conc si no obtenog un ACK cada 0.2 segundos
        this.esperando_ACK_CONC = false;
        this.rta_DCL_CONC = "";
        this.tiempo_interruptor = 0.01;
        this.tiempo_interruptor_msj = 0.09;

        //this.mensaje = ""
        this.mensajes_LPD = [];          //lista donde se guardan los mensajes LPD recibidos
        this.mensajes_LPD_Len = [];      //lista donde se guardan el tamaño del mensage LPD recibo
        this.dec_msj_LPD = false;        //variable booleana para implementar decodificar_msj_LPD() en un hilo diferente.

        this.closeTreads = false

        this.radarInterfaz = radarInterfaz;
        this.socketIO = socketIO;

        this.server = udp.createSocket('udp4');

        this.concetratorStatus = [
            "100111111110010000000000",
            "000010000000100000000000",
            "010000000100000000000000",
            "000000000000000000000000",
            "010000110100010000000000",
            "000000000000000000000000",
            "000000000000000000000000",
            "000000000000000000000000",
            "000000000000000000000000"];    //es donde se guarda el estado recivido desde Python, le va a faltar 
        //la parte de la OBM y HW. Palabra 6,7,8 (indice 5,6,7)

        //--------------------------------------------------    
        //           Envía el mensaje a la FPGA                                
        //--------------------------------------------------    
        this.sendMsg = function (mensaje) {
            //(IP_FPGA, PORT_FPGA)
            let msg = this.codificar_bytearray(mensaje);
            ///console.log("msg",msg,"tipo", typeof msg);
            //this.server.send(msg.toString(), 0, msg.length, this.PORT_FPGA, this.IP_FPGA);//envio el mensaje.  
            this.server.send(msg, 0, msg.length, this.PORT_FPGA, this.IP_FPGA);//envio el mensaje.  
        }
        this.reenviar_estado_CONC = function () {    //metodo para reenviar el estado del CDL CONC a la FPGA hasta recibir el ACK
            if (this.esperando_ACK_CONC === true) {         //si el mensaje ACK no llego todavia:
                //time.sleep(this.tiempo_reenvio_estado_conc)     //espero un tiempo determinado para volver a enviarlo 
                if (this.esperando_ACK_CONC === true) {             //si todavia no recibo el ACK, reenvio el estado del CONC
                    try {
                        socket_TDC.sendMsg(this.rta_DCL_CONC);
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
        }
        this.codificar_bytearray = function (mensaje) {    //funcion que convierte la palabra mensaje "10010...01" a un bytearray para poder mandarla por el socket
            var leng = Math.round((mensaje.length) / 8);
            var msj_ba = new Uint8Array(leng);
            for (let i = 0; i < leng; i = i + 1) {
                msj_ba[i] = parseInt(mensaje.slice(8 * i, 8 * (i + 1)), 2); //[8*i:8*i+8],2)                
            }
            return msj_ba;
        }
        this.decodificar_bytearray = function (mensaje) {   //funcion que convierte el bytearray recibido en la palabra mensaje: "10010...10"

            return mensaje.map(function (x) { return ~x; });

        }
        this.negar_palabra_binaria = function (mensaje) {
            let leng = mensaje.length;
            let mensaje_negado = "";
            for (let i = 0; i < leng; i = i + 1) {
                if (mensaje[i] === "0") {
                    mensaje_negado += "1";
                } else {
                    mensaje_negado += "0";
                }
            }
            return mensaje_negado;
        }
        this.decodificar_AND = function (msg, matriz) { //msg son numeros de 8bit
            //actualizo la fila de la matriz de AND1          
            let row_num = msg[2] & 0x0F; //comienzo con el tercer dato, primero y segundo siempre son iguales.
            let col_num = msg[4] & 0x1F;
            let indice = 0;
            let caracter_bin = msg[5] & 0x7F; //primer caracter recibido, sexto numeero
            //lleno la matriz_AND con los caracteres recibidos, hasta recibir ETX o llegar al final del mensaje
            while (caracter_bin != 0x03 && indice < 32) {     //ETX: End of Text (se termina la cadena de caracteres)
                // ojo, me pueden mandar info erronea, tengo que descartar el mensaje !!! controlar que no se me quede fuera de rango.
                if (col_num < 32) {   // recibo de a una fila por vez
                    try {        //este try cae en except cuando el caracter recibido no es valido -> la info que me llega es erronea
                        matriz[row_num][col_num] = this.lista_caracteres_AND[caracter_bin - 32];
                        col_num += 1;
                        indice += 1;
                        caracter_bin = msg[5 + indice];
                    } catch (error) {
                        break;
                    }
                } else {
                    break;
                }
            }
            if (row_num == 15) {   //en los mensajes AND1 con info de la fila 15 viene la posicion del asterisco en la palabra 15, del bit 23 al 17!

                let nro_col_asterisco = msg[45] & 0x1F;
                matriz[row_num][nro_col_asterisco] = "*";
            }

            //console.log("AND[" + row_num + "]: " + matriz[row_num].toString() + "\n");
        }
        this.binario_2_int = function (binario) {
            let num_int = 0;
            if (binario[0] === "0") {   //numero binario positivo:
                num_int = parseInt(binario, 2);
            } else {                   //el numero binario es negativo -> complemento A2
                let num_bin = "";
                for (let i = 0; i < binario.length; i = i + 1) {
                    if (binario[i] === "0") {
                        num_bin += "1";
                    } else {
                        num_bin += "0";
                    }
                }
                num_int = (-1) * (parseInt(num_bin, 2) + 1);
            }
            return num_int;
        }
        this.uint8_to_int24 = function (array8bit) {

            let array24bit = []

            for (let index = 0; index < array8bit.length / 3; index++) {

                array24bit[index] = array8bit[3 * index] << 16 | array8bit[3 * index + 1] << 8 | array8bit[3 * index + 2];

            }

            return array24bit;
        }
        this.decodificar_msj_recibido = function (msj_uint8) {
            //let confirmacion = msj_uint8.slice(0, 24);
            let confirmacion = (~msj_uint8[0] & 0xFF) << 16 | (~msj_uint8[1] & 0xFF) << 8 | (~msj_uint8[2] & 0xFF); //saco la primera palabra de 24 bit

            //confirmacaion = 24bit
            //2bit reset + 2bit auxiliar + 4bit D.A. + 1bit ACK + 15bit N°. Sec.
            let reset = (confirmacion >> 22) & 0x000003;
            let auxiliarBit = (confirmacion >> 20) & 0x000003;
            let device_add = (confirmacion >> 16) & 0x00000F;
            let ack_o_msj = (confirmacion >> 15) & 0x000001;
            let nro_sec_bin = confirmacion & 0x007FFF;        //nro secuencia binario

            let mensaje = msj_uint8.slice(3);             //la parte util del mensaje recibido
            //1ro) mando el ACK
            if (ack_o_msj == 0) {        //si el mensaje recibido es MSJ 
                if (device_add != 0x0 && device_add != 0x1) {    //y no es de la LPD -> envio el ACK ("0000"->msj de la LPD)
                    //y tampoco es un mensaje de peticion del estado del DCL CONC:
                    let ack = "00" + "00" + device_add.toString() + "1" + nro_sec_bin.toString();
                    this.sendMsg(ack);
                }
                if (device_add == 0x0) {     //mensaje de la LPD

                    console.log(this.mensajes_LPD.length);
                    //if (len(this.mensajes_LPD) < 150){
                    this.mensajes_LPD.push(mensaje);
                    this.mensajes_LPD_Len.push(nro_sec_bin);
                    this.dec_msj_LPD = true;
                    this.decodificar_msj_LPD();
                    //}

                } else if (device_add == 0x1) {   //mensaje de peticion del DCL CONC

                    this.esperando_ACK_CONC = false;
                    let encabezado = this.nro_secuencia.toString(2).padStart(15, '0');
                    encabezado = "00" + "00" + "0100" + "0" + encabezado;
                    //hay que conectar con la gui de python y conectar con el onclick.
                    let estado_CONC = this.return_estado_CONC(); // objeto de la clase TDC.return_estado_CONC
                    estado_CONC = this.negar_palabra_binaria(estado_CONC);    //debo negar el estado del DCL CONC para enviarlo a la FPGA
                    let mensaje_conc = encabezado + estado_CONC;

                    this.rta_DCL_CONC = mensaje_conc;
                    this.sendMsg(mensaje_conc);

                    console.log("DCL: " + mensaje_conc + "\n");

                    this.esperando_ACK_CONC = true;
                    if (this.nro_secuencia < 32767) {
                        this.nro_secuencia += 1;
                    } else {
                        this.nro_secuencia = 0;
                    }
                } else if (device_add === 0x2) {   //mensaje de la AND1

                    this.decodificar_AND(mensaje, this.matriz_AND1);
                    //envio la matriz al objeto AND1 para que actualice la pantalla                    
                    this.socketIO.send_messageAND1(this.matriz_AND2);

                } else if (device_add == 0x3) {   //mensaje de la AND2

                    this.decodificar_AND(mensaje, this.matriz_AND2);
                    //envio la matriz al objeto AND1 para que actualice la pantalla.ver como acomodar esto
                    this.socketIO.send_messageAND2(this.matriz_AND2);

                } else {
                    //console.log("no entro a ningun device address");
                }

            } else if (device_add === 0x4) { //mensaje del DCL CONC -> recibo el ACK del estado del CONC

                this.esperando_ACK_CONC = false;

            } else {
                //console.log("el device address recibido no es valido")
            }
        }
        this.decodificar_msj_LPD = function () {
            while (this.mensajes_LPD.length > 0) {
                let mensaje = this.uint8_to_int24(this.mensajes_LPD[0]); //convireto a palabras de 24bit

                this.mensajes_LPD.shift();       //elimino el elemento de la lista ya tomado.
                /*********************************************************************/
                let leng = this.mensajes_LPD_Len[0];
                this.mensajes_LPD_Len.shift();       //elimino el elemento de la lista ya tomado.
                //console.log("Cantidad de datos:", leng);
                /*********************************************************************/
                let i = 0

                let flag_msjAB1 = false;
                let contador_msj = 0;
                //console.log("mensaje:", mensaje);
                while (i < leng) {
                    let lista_aux = [];      //lista auxiliar donde voy guardando los datos que me llegan
                    let identificador = mensaje[i] & 0x00000F;    //tomo los ultimos 4 bits de cada palabra

                    if (identificador == 0x9) { //----- mensaje AB1 -----//   Picture off centre

                        if (mensaje[i] & 0x000010) { //si el bit 05 es 1: las coordenadas son validas
                            //1  COORDENADA "X"
                            //pasaje palabra binaria a entero -> entero. max (65535 equivalente a 256 DM.)
                            let coord_x = Number((((mensaje[i] & 0xFFFF80) >> 7) * 256 / 65535).toFixed(3));
                            i += 1;
                            //2  COORDENADA "Y"  
                            let coord_y = Number((((mensaje[i] & 0xFFFF80) >> 7) * 256 / 65535).toFixed(3));
                            i += 1;

                            lista_aux.push(coord_x);
                            lista_aux.push(coord_y);
                            this.lista_AB1.push(lista_aux);

                            //console.log("AB1: " + lista_aux + "\n");
                            lista_aux = [];

                        } else {   //si las coordenadas no son validas, solo incremento la variable i
                            i += 2
                        }
                        this.graficar_LPD = true;    //solo se grafica la info recibida en la LPD cuando llega un mensaje AB1, sino se acumula la info de los mensasjes AB2 y AB3 en sus respectivas listas

                        flag_msjAB1 = true;
                        contador_msj = 1;

                    } else if (identificador == 0x1) {//----- mensaje AB2 -----//   Marker Message
                        //variable que guarda si el marcador es valido o no Bit 5
                        let v_valid = (mensaje[i] & 0x000010) >> 4;

                        //1  MARKER "X"
                        let tempNumber = (mensaje[i] & 0x800000) ? -((~mensaje[i] >> 7) & 0x00FFFF) + 1 : (mensaje[i] >> 7) & 0x01FFFF;
                        let marker_x = Number((tempNumber * 256 / 65535).toFixed(3));
                        let PV = (mensaje[i] & 0x000020) >> 5;
                        let LS = (mensaje[i] & 0x000040) >> 6;

                        i += 1;

                        //2  MARKER "Y"
                        tempNumber = (mensaje[i] & 0x800000) ? -((~mensaje[i] >> 7) & 0x00FFFF) + 1 : (mensaje[i] >> 7) & 0x01FFFF;
                        let marker_y = Number((tempNumber * 256 / 65535).toFixed(3));
                        let AP = (mensaje[i] & 0x000020) >> 5;;
                        i += 1
                        let fin_mensaje = true;
                        //----- implemento cuadro PV y AP -----
                        lista_aux.push(marker_x);
                        lista_aux.push(marker_y);

                        if (PV == 0 && AP == 0) {//muestro el punto y fin del mensaje
                            lista_aux.push("muestro");
                            fin_mensaje = true;
                        } else if (PV == 0 && AP == 1) {//muestro el punto y siguen las palabras trios
                            lista_aux.push("muestro");
                            fin_mensaje = false;
                        } else {//PV == "1" and AP == "1" --> no muestro el punto y siguen las palabras trio
                            lista_aux.push("nomuestro");
                            fin_mensaje = false;
                        }
                        lista_aux.push(LS)

                        //3 Caracteres Marker Message
                        if (fin_mensaje == false) {
                            let indice = 0;
                            let desplazamientoBit = 2;
                            let lista_aux2 = [];     //lista donde voy poniendo los simbolos que van llegando
                            let simbolo_bin = (mensaje[i] >> (8 * desplazamientoBit)) & 0x00007F;
                            while (simbolo_bin != 0x17) {  //si el simbolo no es EOMM: ENd of Message Marker:
                                //logica de que hacer con los simbolos: si es un caracter lo agrego a la lista. si es un dibujo, paso el numero y en la clase radar_widget los dibujo
                                if (simbolo_bin === 0x00) {
                                    lista_aux2.push(" ");
                                } else {

                                    if (simbolo_bin > 39 && simbolo_bin < 91) {
                                        lista_aux2.push(this.lista_caracteres_AND[simbolo_bin - 32]);
                                    } else {
                                        lista_aux2.push(simbolo_bin);
                                    }

                                }
                                desplazamientoBit = (3 + desplazamientoBit - 1) % 3;
                                simbolo_bin = (mensaje[i + indice] >> (8 * desplazamientoBit)) & 0x00007F;
                                indice = (desplazamientoBit == 0) ? indice + 1 : indice;
                            }
                            lista_aux.push(lista_aux2)
                            i += indice;
                        }
                        //si V = 1: el marcador es valido y se muestra, sino no se hace nada.
                        if (v_valid == "1") {
                            this.lista_AB2.push(lista_aux)

                            //console.log("AB2: " + lista_aux + "\n");
                        }
                        lista_aux = []
                        //joel
                        if (flag_msjAB1 == true) {
                            if (contador_msj === 1) { //buque propio
                                contador_msj += 1;
                            } else if (contador_msj === 2) { //cursor izquierdo
                                this.radarInterfaz.setOBM1Coordenada(marker_x, marker_y);
                                contador_msj += 1;
                            } else if (contador_msj === 3) { //cursor derecho
                                this.radarInterfaz.setOBM2Coordenada(marker_x, marker_y);
                                contador_msj += 1;
                            }
                        }
                    } else if (identificador == 0x5) {  //----- mensaje AB3 -----//
                        //si el bit 5 de la palabra AB3//1 es 1: el cursor es valido
                        if (mensaje[i] & 0x000010) {
                            // CURSOR ANGLE
                            let tempNumber = (mensaje[i] & 0x800000) ? -((~mensaje[i] >> 12) & 0x0007FF) + 1 : (mensaje[i] >> 12) & 0x000FFF;
                            let cursor_angle = Number((tempNumber * 180 / 2048).toFixed(3));
                            let mostraDisplay = (mensaje[i] >> 6) & 0x000001;
                            i += 1;
                            //2: CURSOR LENGTH
                            let cursor_length = Number(((mensaje[i] >> 7) * 256 / 65535).toFixed(3));
                            let cursor_type = ((mensaje[i] >> 4) & 0x000007);
                            i += 1;
                            //3: CURSOR ORIGIN "X"
                            tempNumber = (mensaje[i] & 0x800000) ? -((~mensaje[i] >> 7) & 0x00FFFF) + 1 : (mensaje[i] >> 7) & 0x01FFFF;
                            let cursor_origin_x = Number((tempNumber * 256 / 65535).toFixed(3));
                            i += 1;
                            //4: CURSOR ORIGIN "Y"
                            tempNumber = (mensaje[i] & 0x800000) ? -((~mensaje[i] >> 7) & 0x00FFFF) + 1 : (mensaje[i] >> 7) & 0x01FFFF;
                            let cursor_origin_y = Number((tempNumber * 256 / 65535).toFixed(3));
                            i += 1

                            lista_aux.push(cursor_angle);
                            lista_aux.push(cursor_length);
                            lista_aux.push(cursor_type);
                            lista_aux.push(cursor_origin_x);
                            lista_aux.push(cursor_origin_y);
                            this.lista_AB3.push(lista_aux);

                            //console.log("AB3: " + lista_aux + "\n");
                            lista_aux = []
                            //joel
                            if (mostraDisplay) {
                                this.radarInterfaz.setHandwheelCoordenada(cursor_origin_x, cursor_origin_y, cursor_angle, cursor_length)
                                contador_msj += 1;
                            }
                        } else {
                            i += 4
                        }
                    } else {   //palabra incorrecta, no hago nada e incremento i. Nunca deberia llegar a esta instancia pero es por si hay un error en el envio/recepcion del mensaje
                        i += 1;
                    }
                }
                this.dec_msj_LPD = false    //que no entre a decodificar_msj_LPD() hasta que no llegue otro mensaje LPD (por el Timer)         

                // llamo al metodo graficar_info_LPD() para mostrar la info en el radar (siempre y cuando haya llegado un mensaje AB1):
                if (this.graficar_LPD === true) {

                    //comento esta linea para que no grafique, y probar que la counicacion funciona
                    //joel
                    //this.gui.mostrarAzimut(this.gui.RadarWidget.CoordenadaHnadwheel[0])
                    //this.gui.mostrarDistancia(this.gui.RadarWidget.CoordenadaHnadwheel[1])
                    //joel
                    //this.gui.graficar_info_LPD(this.lista_AB1, this.lista_AB2, this.lista_AB3)

                    this.radarInterfaz.borrarPuntos();
                    this.radarInterfaz.graficar_markers(this.lista_AB2);
                    this.radarInterfaz.graficar_cursores(this.lista_AB3);
                    this.radarInterfaz.set_origen_x_y(this.lista_AB1);

                    //console.log("AB1:", this.lista_AB1);
                    //console.log("AB2:", this.lista_AB2);
                    //console.log("AB3:", this.lista_AB3);

                    flag_msjAB1 = false;
                    contador_msj = 0;

                    this.lista_AB1 = []     //vacio las listas para completarlas con la info nueva que recibiremos de la FPGA
                    this.lista_AB2 = []
                    this.lista_AB3 = []
                    this.graficar_LPD = false;
                }
            }
        }
    }

    return_estado_CONC() {
        //pido el estado de los pulsadores, conexion con python yradarWidget.
        let handwheelRadius, handwheelAngle = this.radarInterfaz.get_lista_coordenadasHW();
        let rollingBallLeftX, rollingBallLeftY = this.radarInterfaz.get_lista_coordenadasOBM1();
        let rollingBallRigthX, rollingBallRigthY = this.radarInterfaz.get_lista_coordenadasOBM1();

        //this.concetratorStatus[5] = handwheelAngle + handwheelRadius + "00000000";
        //this.concetratorStatus[6] = rollingBallLeftX + rollingBallLeftY + "00000000";
        //this.concetratorStatus[7] = rollingBallRigthX + rollingBallRigthY + "00000000";
        //console.log(handwheelAngle);
        //console.log(handwheelRadius);
        //console.log(rollingBallLeftX);
        //console.log(rollingBallLeftY);
        //console.log(rollingBallRigthX);
        //console.log(rollingBallRigthY);
        let status = this.concetratorStatus.reduce((accu, str) => {
            return accu + str;
        });

        return status;
    }
    estadoCONC(data) {
        /*let buffer = data.map(function(x){
            return parseInt(x,2);
        })*/
        this.concetratorStatus = data;
    }
    set_listener() {
        this.server.bind(this.PORT_TDC, this.IP_TDC);
        //-------------------------------------------------------------------
        //       Servicio que procesa los mensajes recibidos de la FPGA      
        //-------------------------------------------------------------------
        this.server.on('message', (msg, rinfo) => {  //funcion derecepcion de mensajes.
            //msg es del tipo 'Buffer'
            //rinfo posee la ip de origen, el puerto de origen, tipo de conexion, longitud de los datos. 
            //console.log(msg);

            let mensaje = this.decodificar_bytearray(msg);
            //////console.log(mensaje);
            this.decodificar_msj_recibido(mensaje);
        });
        this.server.on('error', (err) => {   //en el caso que no se abra el socket o cualquier error.
            ////console.log(`server error:\n${err.stack}`);
            server.close();
        });
    }
}

module.exports = TDClogica;