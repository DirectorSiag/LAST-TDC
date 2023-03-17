var udp = require('dgram');

class TDClogica {
    /*
    esta es la clase principal, la encargada de implementar la logica de la 
    tactica, y su comunicacion con la FPGA
    */
    constructor(radarInterfaz) {
        //this.gui = TDC_GUI()
        //this.gui.show()
        //console.log("hola");
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

        this.server = udp.createSocket('udp4');

        this.radarInterfaz = radarInterfaz;
        //--------------------------------------------------    
        //           Envía el mensaje a la FPGA                                
        //--------------------------------------------------    
        this.sendMsg = function (mensaje) {
            //(IP_FPGA, PORT_FPGA)
            let msg = this.codificar_bytearray(mensaje);
            this.server.send(msg.toString(), 0, msg.length, this.PORT_FPGA, this.IP_FPGA);            //envio el mensaje.  
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
            var msj_ba = [];
            for (let i = 0; i < leng; i = i + 1) {
                msj_ba[i] = parseInt(mensaje.slice(8 * i, 8 * (i + 1)), 2); //[8*i:8*i+8],2)                
            }
            return msj_ba;
        }
        this.decodificar_bytearray = function (mensaje) {   //funcion que convierte el bytearray recibido en la palabra mensaje: "10010...10"
            let leng = mensaje.length;
            let msj = "";
            let str = "";
            for (let i = 0; i < leng; i = i + 1) {
                str = mensaje[i].toString(2);
                msj += str.padStart(8, '0');
            }
            return msj;
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
        this.decodificar_AND = function (msg, matriz) {
            //actualizo la fila de la matriz de AND1          
            let row_num = parseInt(msg.slice(20, 24), 2);
            let col_num = parseInt(msg.slice(35, 40), 2);
            let indice = 0;
            let caracter_bin = msg.slice(41, 48); //primer caracter recibido
            //lleno la matriz_AND con los caracteres recibidos, hasta recibir ETX o llegar al final del mensaje
            while (caracter_bin !== "0000011" && indice < 32) {     //ETX: End of Text (se termina la cadena de caracteres)
                // ojo, me pueden mandar info erronea, tengo que descartar el mensaje !!! controlar que no se me quede fuera de rango.
                if (col_num < 32) {   // recibo de a una fila por vez
                    try {        //este try cae en except cuando el caracter recibido no es valido -> la info que me llega es erronea
                        matriz[row_num][col_num] = this.lista_caracteres_AND[parseInt(caracter_bin, 2) - 32];
                        col_num += 1;
                        indice += 1;
                        caracter_bin = msg.slice(41 + 8 * indice, 48 + 8 * indice);
                    } catch (error) {
                        break;
                    }
                } else {
                    break;
                }
            }
            if (row_num == 15) {   //en los mensajes AND1 con info de la fila 15 viene la posicion del asterisco en la palabra 15, del bit 23 al 17!

                let nro_col_asterisco = parseInt(msg.slice(339, 344), 2);
                matriz[row_num][nro_col_asterisco] = "*";
            }
            let str = "AND[" + row_num + "]: " + matriz[row_num].toString() + "\n";
            
            console.log(str);
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
        this.decodificar_msj_recibido = function (msj_bin) {
            let confirmacion = msj_bin.slice(0, 24);
            let reset = msj_bin.slice(0, 2);
            let device_add = msj_bin.slice(4, 8);
            let ack_o_msj = msj_bin[8];
            let nro_sec_bin = msj_bin.slice(9, 24);        //nro secuencia binario

            let mensaje = msj_bin.slice(24);             //la parte util del mensaje recibido
            mensaje = this.negar_palabra_binaria(mensaje)    // la info de la FPGA viene negada, por lo que debo volver a negarla para poder decodificarla

            //1ro) mando el ACK
            if (ack_o_msj === "0") {        //si el mensaje recibido es MSJ 
                if (device_add !== "0000") {    //y no es de la LPD -> envio el ACK ("0000"->msj de la LPD)
                    if (device_add !== "0001") {    //y tampoco es un mensaje de peticion del estado del DCL CONC:
                        let ack = "00" + "00" + device_add + "1" + nro_sec_bin;
                        this.sendMsg(ack);
                    }
                }
                if (device_add == "0000") {     //mensaje de la LPD

                    console.log(this.mensajes_LPD.length);
                    //if (len(this.mensajes_LPD) < 150){
                    this.mensajes_LPD.push(mensaje);
                    this.mensajes_LPD_Len.push(parseInt(nro_sec_bin, 2));
                    this.dec_msj_LPD = true;
                    this.decodificar_msj_LPD();
                    //}

                } else if (device_add == "0001") {   //mensaje de peticion del DCL CONC

                    this.esperando_ACK_CONC = false;
                    let encabezado = this.nro_secuencia.toString(2).padStart(15, '0');
                    encabezado = "00" + "00" + "0100" + "0" + encabezado;
                    //hay que conectar con la gui de python y conectar con el onclick.
                    let estado_CONC = this.return_estado_CONC(); // objeto de la clase TDC.return_estado_CONC
                    estado_CONC = this.negar_palabra_binaria(estado_CONC);    //debo negar el estado del DCL CONC para enviarlo a la FPGA
                    let mensaje_conc = encabezado + estado_CONC;

                    this.rta_DCL_CONC = mensaje_conc;
                    this.sendMsg(mensaje_conc);
                    
                    //console.log("DCL: " + mensaje_conc + "\n");

                    this.esperando_ACK_CONC = true;
                    if (this.nro_secuencia < 32767) {
                        this.nro_secuencia += 1;
                    } else {
                        this.nro_secuencia = 0;
                    }
                } else if (device_add === "0010") {   //mensaje de la AND1

                    this.decodificar_AND(mensaje, this.matriz_AND1);
                    //envio la matriz al objeto AND1 para que actualice la pantalla                    
                    this.get_matrizAND1(this.matriz_AND1);
                    try {

                        this.fn_actualizar_AND1(this.matriz_AND1);

                    } catch (error) {

                    }

                } else if (device_add == "0011") {   //mensaje de la AND2

                    this.decodificar_AND(mensaje, this.matriz_AND2);
                    //envio la matriz al objeto AND1 para que actualice la pantalla.ver como acomodar esto
                    this.get_matrizAND2(this.matriz_AND2);
                    try {
                        fn_actualizar_AND2(this.matriz_AND2);
                    } catch (error) {

                    }

                } else {
                    console.log("no entro a ningun device address");
                }

            } else if (device_add === "0100") { //mensaje del DCL CONC -> recibo el ACK del estado del CONC

                this.esperando_ACK_CONC = false;

            } else {
                console.log("el device address recibido no es valido")
            }
        }
        this.decodificar_msj_LPD = function () {
            while (this.mensajes_LPD.length > 0) {
                let mensaje = this.mensajes_LPD[0];
                this.mensajes_LPD.shift();       //elimino el elemento de la lista ya tomado.
                //leng = round(len(mensaje)/24)   //cantidad de palabras dentro del mensaje
                let leng = this.mensajes_LPD_Len[0];
                this.mensajes_LPD_Len.shift();       //elimino el elemento de la lista ya tomado.
                let i = 0

                let flag_msjAB1 = false;
                let contador_msj = 0;

                while (i < leng) {
                    let lista_aux = [];      //lista auxiliar donde voy guardando los datos que me llegan
                    let identificador = mensaje.slice(20 + 24 * i, 24 + 24 * i);    //tomo los ultimos 4 bits de cada palabra

                    if (identificador == "1001") { //----- mensaje AB1 -----//   Picture off centre
                        //print("Es un mensaje AB1")
                        //this.print_txt("    Mensaje AB1")
                        if (mensaje[19 + 24 * i] === "1") { //si el bit 05 es 1: las coordenadas son validas
                            //1  COORDENADA "X"
                            //pasaje palabra binaria a entero -> entero. max (65535 equivalente a 256 DM.)
                            let coord_x = (this.binario_2_int(mensaje.slice(24 * i, 17 + 24 * i)) * 256 / 65535).toFixed(2);
                            i += 1;
                            //2  COORDENADA "Y"  
                            let coord_y = (this.binario_2_int(mensaje.slice(24 * i, 17 + 24 * i)) * 256 / 65535).toFixed(2);
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
                    } else if (identificador === "0001") {//----- mensaje AB2 -----//   Marker Message
                        let v_valid = mensaje[19 + 24 * i]     //variable que guarda si el marcador es valido o no

                        //1  MARKER "X"
                        let marker_x = (this.binario_2_int(mensaje.slice(24 * i, 17 + 24 * i)) * 256 / 65535).toFixed(3);
                        let PV = mensaje[18 + 24 * i];
                        let LS = mensaje[17 + 24 * i];

                        i += 1;

                        //2  MARKER "Y"
                        let marker_y = (this.binario_2_int(mensaje.slice(24 * i, 17 + 24 * i)) * 256 / 65535).toFixed(3);
                        let AP = mensaje[18 + 24 * i];
                        i += 1
                        let fin_mensaje = true;
                        //----- implemento cuadro PV y AP -----
                        if (PV === "0" && AP === "0") {     //muestro el punto y fin del mensaje
                            lista_aux.push(marker_x);
                            lista_aux.push(marker_y);
                            lista_aux.push("muestro");
                            fin_mensaje = true;
                        } else if (PV === "0" && AP === "1") {   //muestro el punto y siguen las palabras trios
                            lista_aux.push(marker_x);
                            lista_aux.push(marker_y);
                            lista_aux.push("muestro");
                            fin_mensaje = false;
                        } else {   //PV == "1" and AP == "1" --> no muestro el punto y siguen las palabras trio
                            lista_aux.push(marker_x);
                            lista_aux.push(marker_y);
                            lista_aux.push("nomuestro");
                            fin_mensaje = false;
                        }
                        lista_aux.push(LS)

                        //3 Caracteres Marker Message
                        if (fin_mensaje == false) {
                            let indice = 0;
                            let lista_aux2 = [];     //lista donde voy poniendo los simbolos que van llegando
                            let simbolo_bin = mensaje.slice(1 + 24 * i, 8 + 24 * i);
                            while (simbolo_bin !== "0010111") {  //si el simbolo no es EOMM: ENd of Message Marker:
                                //logica de que hacer con los simbolos: si es un caracter lo agrego a la lista. si es un dibujo, paso el numero y en la clase radar_widget los dibujo
                                if (simbolo_bin === "0000000") {
                                    lista_aux2.push(" ");
                                } else {
                                    let simbolo = parseInt(simbolo_bin, 2);       //obtengo el numero decimal 
                                    if (simbolo > 39 && simbolo < 91) {
                                        lista_aux2.push(this.lista_caracteres_AND[simbolo - 32]);
                                    } else {
                                        lista_aux2.push(simbolo);
                                    }
                                }
                                indice += 1;
                                simbolo_bin = mensaje.slice(1 + 24 * i + 8 * indice, 8 + 24 * i + 8 * indice);
                                //funcion para mostrar todo esto en la LPD. 
                            }
                            lista_aux.push(lista_aux2)
                            i += parseInt((indice + 1) / 3)
                        }
                        if (v_valid == "1") {       //si V = 1: el marcador es valido y se muestra, sino no se hace nada.
                            //this.lista_AB2.append(lista_aux)
                            this.lista_AB2.push(lista_aux)
                            
                            //console.log("AB2: " + lista_aux + "\n");
                        }
                        lista_aux = []
                        //joel
                        if (flag_msjAB1 == true) {
                            if (contador_msj === 1) { //buque propio
                                contador_msj += 1;
                            } else if (contador_msj === 2) { //cursor izquierdo
                                //this.gui.RadarWidget.CoordenadaRolingL[0] = marker_x
                                //this.gui.RadarWidget.CoordenadaRolingL[1] = marker_y
                                contador_msj += 1;
                            } else if (contador_msj === 3) { //cursor derecho
                                //this.gui.RadarWidget.CoordenadaRolingR[0] = marker_x
                                //this.gui.RadarWidget.CoordenadaRolingR[1] = marker_y
                                contador_msj += 1;
                            }
                        }
                    } else if (identificador === "0101") {  //----- mensaje AB3 -----//
                        if (mensaje[19 + 24 * i] === "1") {     //si el bit 5 de la palabra AB3//1 es 1: el cursor es valido
                            // CURSOR ANGLE
                            let cursor_angle = (this.binario_2_int(mensaje.slice(24 * i, 12 + 24 * i)) * 180 / 2048).toFixed(2);
                            i += 1;
                            //2: CURSOR LENGTH
                            let cursor_length = (this.binario_2_int(mensaje.slice(0 + 24 * i, 17 + 24 * i)) * 256 / 65535).toFixed(2);
                            let cursor_type = parseInt(mensaje.slice(17 + 24 * i, 20 + 24 * i), 2);
                            i += 1;
                            //3: CURSOR ORIGIN "X"
                            let cursor_origin_x = (this.binario_2_int(mensaje.slice(0 + 24 * i, 17 + 24 * i)) * 256 / 65535).toFixed(2);
                            i += 1;
                            //4: CURSOR ORIGIN "Y"
                            let cursor_origin_y = (this.binario_2_int(mensaje.slice(0 + 24 * i, 17 + 24 * i)) * 256 / 655352).toFixed(2);
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
                            if (flag_msjAB1 == true && contador_msj === 4) {
                                //this.gui.RadarWidget.CoordenadaHnadwheel[0] = cursor_angle
                                //this.gui.RadarWidget.CoordenadaHnadwheel[1] = cursor_length
                                //this.gui.RadarWidget.CoordenadaHnadwheel[2] = cursor_origin_x
                                //this.gui.RadarWidget.CoordenadaHnadwheel[3] = cursor_origin_y
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

                    console.log("AB1:", this.lista_AB1);
                    console.log("AB2:", this.lista_AB2);
                    console.log("AB3:", this.lista_AB3);

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
        return "000001000000000000011010011000000001101111111111111111111111111111111111101111111011111111111111111111111111111111111111101111001011101111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111DCL: 000001000000000000011011011000000001101111111111111111111111111111111111101111111011111111111111111111111111111111111111101111001011101111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111";
    }
    get_matrizAND2(matriz) {
        //enviar el contenido a la AND2, conexion con python
        return 0;
    }
    fn_actualizar_AND2(matriz) {
        //Actualizar la AND 2, conexion con python
        return 0;
    }
    get_matrizAND1(matriz) {
        //enviar el contenido a la AND2, conexion con python
        return 0;
    }
    fn_actualizar_AND1(matriz) {
        //Actualizar la AND 2, conexion con python
        return 0;
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
            //console.log(mensaje);
            this.decodificar_msj_recibido(mensaje);
        });
        this.server.on('error', (err) => {   //en el caso que no se abra el socket o cualquier error.
            //console.log(`server error:\n${err.stack}`);
            server.close();
        });
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////
    /*        
    timer_interrupt (){
        //print("ocurre interrupcion del timer")
        //this.reenviar_estado_CONC()
        //if this.closeTreads == false:
        //    t = threading.Timer(this.tiempo_interruptor, this.timer_interrupt)
        //    t.start()
    }

    timer_interrupt_lpd (){
        //print("ocurre interrupcion del timer")
        //if this.dec_msj_LPD == true:
        //    this.decodificar_msj_LPD()
        //if this.closeTreads == false:
        //    t = threading.Timer(this.tiempo_interruptor, this.timer_interrupt_lpd)
        //    t.start()
    }

    init_threads(){
        //global thread_server
        //global thread_ack_CONC
        //global thread_listener
        //global timer_int_lpd
        //global timer_int
        //
        //thread_ack_CONC = threading.Thread(target = this.reenviar_estado_CONC)
        //thread_ack_CONC.start()     //start hilo de la funcion reenviar_estado_CONC
        //
        ////thread_listener = threading.Thread(target = this.thread_teclado)
        ////thread_listener.start()
        //timer_int = threading.Timer(this.tiempo_interruptor, this.timer_interrupt)
        //timer_int.start()
        //
        //timer_int_lpd = threading.Timer(this.tiempo_interruptor, this.timer_interrupt_lpd)
        //timer_int_lpd.start()
        //
        ////hilo que maneja el teclado. llama a la funcion this.gui.tecla_apretada_mik cuando se preciona una tecla.
        //thread_listener = keyboard.Listener(on_press = this.gui.tecla_apretada_mik, on_release=this.gui.tecla_liberada_mik)
        //thread_listener.start()
        //
        //
        //thread_server = threading.Thread(target = this.receiveServer)
        //thread_server.start()       //start hilo de la funcion receiveServer.
    }
    */
}

module.exports = TDClogica;