class InputControl {

    constructor(input, min_value, max_value, update_callback) {
        // Funcion invocada en la instanciación
        // de la clase
        this.input = input;
        this.min_value = min_value;
        this.max_value = max_value;
        this.update_callback = update_callback;
        // Funcion llamada cuando se hace un cambio manualmente

        this.on_focus = false;

        this.add_listener = function() {
            let $this = this;

            this.input.addEventListener('input', (event) => {
                $this.updateValue(event, $this);
            });

            // Evento de adquisición de foco
            this.input.addEventListener("focus", (event) => {
                $this.on_focus = true;
            });

            // Evento de perdida del foco
            this.input.addEventListener('blur', (event) => {
                $this.on_focus = false;
            });

            // Evento de presionamiento de tecla
            this.input.addEventListener("keyup", (event) => {
                if (event.key == "Enter") {
                    let value = Number($this.input.value).toString();
                    $this.update_callback(value);
                    $this.input.blur();
                }
            });
        }

        this.updateValue = function(data, $this) {

            let lastValue = data.target.value.substr(-1);

            if (lastValue == '.') { // Me fijo si el input ya tiene un punto
                let str = data.target.value.split('');
                let dotCounter = str.reduce((accu, s) => {
                    if (s == '.') return accu + 1;
                    else return accu;
                }, 0);

                if (dotCounter > 1) { // Elimino el valor ingresado

                    data.target.value = data.target.value.substr(0, data.target.value.length - 1);

                }
            } else if ((lastValue < '0' || lastValue > '9') && lastValue != '.') { // Filtro para que sean numeros y el punto, nada mas

                data.target.value = data.target.value.substr(0, data.target.value.length - 1);

            }
            if (Number(data.target.value) < $this.min_value) {

                data.target.value = $this.min_value;

            } else if (Number(data.target.value) >= $this.max_value) { // Para el azimut maximo

                data.target.value = $this.max_value;

            } else if (Number(data.target.value * 1000) % 100 > 0) { // Para agregar el .0 en el numero.

                data.target.value = parseInt(Number(data.target.value) * 10) / 10;

            }
        }

        this.add_listener();

    }

    editValue(value) {
        if (!this.on_focus) {
            this.input.value = value.toFixed(1).toString();
            return true;
        }

        return false;
    }

    focused() {
        return this.on_focus;
    }

}

module.exports = InputControl;