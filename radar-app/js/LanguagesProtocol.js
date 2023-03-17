/*
 *
 * En este archivo se definen para cada instruccion
 * que se recibe del socket que accion realizar.
 *
 */

class LangProt {

    constructor(socket, control_class) {
        // Funcion invocada en la instanciación
        // de la clase
        this.socket = socket;
        this.control_class = control_class;
    }

    take_action(msg) {
        /*
         * Recibe un mensaje y decide que accion
         * realizar.
         */
        var action = "this.control_class." + msg;
        var resp = eval(action); //ejecuta codigo

        if (resp != undefined) { // Si hay respuesta
            // Lo mandamos por el socket.
            this.socket.send_message(String(resp));
            // Convierte en cadena el dato
            // sin importar su tipo.

            /*
            IMPORTANTE:

            Un numero, lo manda como cadena
            Una cadena, queda igual
            Una lista, ejemplo: [1, 2, 3] -> Envía: "1,2,3"
            */
        }
    }

}

module.exports = LangProt;
