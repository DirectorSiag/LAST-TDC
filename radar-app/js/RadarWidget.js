class RadarWidget {

    constructor(ROLE) {
        // Funcion invocada en la instanciación
        // de la clase
        this.ROLE = ROLE;
        // Defino objetos
        this.radar = document.getElementsByClassName("radar")[0];
        this.pointer_list = this.radar.getElementsByClassName("pointer_list")[0];
        this.text_list = this.radar.getElementsByClassName("text_list")[0];
        this.image_list = this.radar.getElementsByClassName("image_list")[0];
        this.lines_list = this.radar.getElementsByClassName("lines_list")[0];//devuelve un array y se queda con el primero
        this.angle_points = document.getElementsByClassName("angle_points")[0];
        // Elementos constantes
        this.pointSize = 10;
        this.origen_x = 0;
        this.origen_y = 0;
        this.color_punto = "ro";
        this.escala_DM = 32;
        this.cant_maxima_delta = 127;
        this.zoom = 0.15;
        this.text_offset = 0;
        this.text_offset_derrota = 10;
        this.std_image_size = [100, 100]; // Ancho y alto estandar
        this.NumberTrack = true;
        this.MainSymbol = true;
        this.LinkStatus = true;
        this.AmplInfo = true;
        this.Trakeo = true;

        this.rollball_L_DX = [];
        this.rollball_L_DY = [];
        this.rollball_R_DX = [];
        this.rollball_R_DY = [];
        this.handwheel_DA = [];
        this.handwheel_DR = [];

        this.rollball_DX_temp = undefined;
        this.rollball_DY_temp = undefined;
        
        // Diccionarios
        this.LPD_symbols_table = {
            // Superficie
            "2996": ["sup_pendiente_orig.png", "ro"],
            "29100": ["sup_posible_amigo_orig.png", "ro"],
            "30": ["sup_amigo_confirmado_orig.png", "ro"],
            "29124": ["sup_posible_hostil_orig.png", "ro"],
            "31": ["sup_hostil_confirmado_orig.png", "ro"],
            "29": ["sup_desconocido_orig.png", "ro"],
            // Aire
            "1": ["aire_desconocido_orig.png", "go"],
            "1100": ["aire_posible_amigo_orig.png", "go"],
            "2": ["aire_amigo_confirmado_orig.png", "go"],
            "1124": ["aire_posible_hostil_orig.png", "go"],
            "3": ["aire_hostil_confirmado_orig.png", "go"],
            "196": ["aire_pendiente_orig.png", "go"],
            // Submarino
            "25": ["sub_desconocido_orig.png", "bo"],
            "25100": ["sub_posible_amigo_orig.png", "bo"],
            "26": ["sub_amigo_confirmado_orig.png", "bo"],
            "25124": ["sub_posible_hostil_orig.png", "bo"],
            "27": ["sub_hostil_confirmado_orig.png", "bo"],
            "2596": ["sub_pendiente_orig.png", "bo"],
            // Simbolos no contemplado por OTAN
            "10": ["0001010.png", "bo"],
            "17": ["pdr_fix.png", "bo"],
            "18": ["pdr_punto_de_referencia.png", "bo"],
            "19": ["pdr_punto_dato.png", "bo"],
            "28": ["pdr_no_sub.png", "bo"]
        };
        this.AF_symbols_table = {
            "11": "0001011.png",
            "28": "0011100.png",
            "22": "0010110.png",
            "15": "cursor_alargado.png",
            "31": "circulos.png",
            "16": "0010000.png",
            "38": "0100110.png",
            "18": "pdr_punto_de_referencia.png",
            "30": "cimpes.png",
            "31": "circulos.png",
            "28": "pdr_no_sub.png"
        };
        this.tipos_de_linea = [
            "solid",
            "dash_1",
            "dash_2",
            "dash_3",
            "dash_4",
            "dash_5",
            "dash_6",
            "dash_7"
        ];
        this.coordenada_handwheel = [0, 0, 0, 0]; //Angle, Radius, X, Y
        this.handwheel_DR = [];
        this.handwheel_DA = [];
        this.coordenada_rolling_L = [0, 0];
        this.coordenada_rolling_R = [0, 0];

        this.round_value = function (value, decimals) {
            /*
            Funcion para redondear un valor con ciertos decimales.
            */
            return Number(value.toFixed(decimals))
        }

        this.add_element = function (parent, child, properties) {
            /*
            Añade un elemento hijo a un elemento padre
            Le asigna las propiedades en "properties"
            "properties" es un diccionario con las propiedades
            como keys y sus valores como values
            */
            var node = document.createElement(child);

            for (const [key, value] of Object.entries(properties)) {
                node[key] = value;
            }

            parent.appendChild(node);

            return parent.children[parent.children.length - 1];
        }

        this.get_el_coord = function (element) {
            /*
            Obtiene el objeto "Rect" que devuelve una tupla
            con parametros top,left,right,bottom,x,y,width y height.
            */
            var objRect = element.getBoundingClientRect();
            return objRect;
        }

        this.center_to_radar = function (x, y, last_child, ima_x=0, ima_y=0) {
            /*
            Ubica un elemento en una posicion relativa al centro
            de su elemento padre.
            */
            var radarRect = this.get_el_coord(this.radar);
            var center_x = (radarRect.width / 2);
            var center_y = (radarRect.height / 2);

            [x, y] = this.new_position(x, y);

            last_child.style.left = (center_x + x - ima_x) + "px";
            last_child.style.top = (center_y - y - ima_y) + "px";
            
        }

        this.calc_module = function (x, y, center_x = null, center_y = null) {
            /*
            Calculo el modulo de las coordenadas.
            */
            if (center_x && center_y) {
                x = x - center_x;
                y = y - center_y;
            }
            return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
        }

        this.calc_angle = function (x, y) {
            /*
            Calculo el angulo de las coordenadas.
            */
            var angle = Math.atan2(y, x);

            return angle;
        }

        this.get_xy = function (modulo, angulo) {
            /*
            Obtiene las coordenadas (x, y).
            */
            var x = modulo * Math.cos(angulo);
            var y = modulo * Math.sin(angulo);

            return [x, y];
        }

        this.new_position = function (x, y) {
            /*
            Calcula la posicion en el DOM tomando el valor en (x, y),
            las dimensiones del radar, y la escala actual.
            */
            var modulo = this.calc_module(x, y);
            var angulo = this.calc_angle(x, y);

            var porcentaje = modulo / this.escala_DM;

            var radar_rect = this.get_el_coord(this.radar);
            //var dim_modulo = this.calc_module(radar_rect.x * 2, radar_rect.y * 2);
            //var dim_modulo = this.calc_module(radar_rect.width / 2, radar_rect.height / 2);
            var dim_modulo = radar_rect.width / 2;
            var nuevo_modulo = dim_modulo * porcentaje;

            var [x, y] = this.get_xy(nuevo_modulo, angulo);

            return [x, y];
        }

        this.from_cursor_to_xy = function (angle, length) {
            /*
            Código que convierte el ángulo recibido por el DHC a ejes cartesianos, siendo X el eje de referencia.
            */
            var x, y;
            if (angle >= 0 && angle <= (Math.PI / 2)) {
                x = this.round_value(length * Math.sin(angle), 3);
                y = this.round_value(length * Math.cos(angle), 3);
            } else if (angle > (Math.PI / 2) && angle <= Math.PI) {
                x = this.round_value(length * Math.sin(Math.PI - angle), 3);
                y = this.round_value(-length * Math.cos(Math.PI - angle), 3);
            } else if (angle >= (-Math.PI / 2) && angle < 0) {
                x = this.round_value(length * Math.sin(angle), 3);
                y = this.round_value(length * Math.cos(angle), 3);
            } else {
                x = this.round_value(length * Math.sin(Math.PI - angle), 3);
                y = this.round_value(-length * Math.cos(Math.PI - angle), 3);
            }

            return [x, y];
        }

        this.convert_to_rad = function(angle) {
            return (angle * Math.PI) / 180;
        }

        this.polar_2_xy = function (theta, radio) {
            /*
            Funcion que convierte coordenadas polares
            en coordenadas cartesianas.

            theta debe estar en radianes
            */
            var x = radio * Math.cos(theta);
            var y = radio * Math.sin(theta);

            x = this.round_value(x);
            y = this.round_value(y);

            return [x, y];
        }

        this.xy_2_polar = function (x, y) {
            /*
            Funcion que convierte coordenadas cartesianas
            en coordenadas polares.

            Devuelve theta en radianes.
            */
            var theta = Math.atan(y, x);
            var radio = this.calc_module(x, y);

            theta = this.round_value(theta);
            radio = this.round_value(radio);

            return [theta, radio];
        }

        this.int_2_binario = function (entero, bits) {
            /*
            Convierte un valor decimal en una cadena de
            su representacion binaria.
            */
            var string;

            if (entero < 0) {
                string = (entero >>> 0).toString(2);
                string = string.substring(string.length - bits, string.length);
            } else {
                string = entero.toString(2);
                string = string.padStart(bits, "0");
            }

            return string;
        }

        this.calc_control_var = function (delta_x) {
            /*
            Obtiene una lista de saltos segun una ley cuadratica.
            */
            var rollball = [];
            /*
            var saltos_positivos = [256, 64, 16, 4, 1, 0.25];
            var saltos_negativos = [-256, -64, -16, -4, -1, -0.25];;
            var adiciones = [64, 32, 16, 8, 4, 2];
            while (Math.abs(delta_x) >= 0.25) {
                for (var salto = 0; salto <= saltos_positivos.length; salto++) {
                    if (delta_x >= saltos_positivos[salto]) {
                        rollball.push(this.int_2_binario(adiciones[salto], 8));
                        delta_x -= saltos_positivos[salto];
                        break;
                    }
                }

                for (var salto = 0; salto <= saltos_negativos.length; salto++) {
                    if (delta_x <= saltos_negativos[salto]) {
                        rollball.push(this.int_2_binario(-adiciones[salto], 8));
                        delta_x -= saltos_negativos[salto];
                        break;
                    }
                }
            }
            */
            if (delta_x >= 0) {
                while (delta_x >= 1024) {//maximo valo que se puede enviar
                    rollball.push(this.int_2_binario(127, 8));
                    delta_x -= 1008.0625;
                }
                while (delta_x >= 0.1) { //decompopongo el numero en pezaso mas chicos, 
                                            //la formula cuadratica posee mas precisión en numeros pequeños,
                                            //por eso el bucle
                    let ultimoDelta = Math.trunc(Math.sqrt(16 * Math.abs(delta_x)));
                    rollball.push(this.int_2_binario(ultimoDelta, 8));
                    delta_x -= ultimoDelta * ultimoDelta / 16;    
                }
            } else {
                while (delta_x <= -1024) {//maximo valor que se puede enviar
                    rollball.push(this.int_2_binario(-127, 8));
                    delta_x += 1008.0625;
                }
                while (delta_x <= -0.1) {//decompopongo el numero en pezaso mas chicos, 
                                            //la formula cuadratica posee mas precisión en numeros pequeños,
                                            //por eso el bucle
                    let ultimoDelta = -Math.trunc(Math.sqrt(16 * Math.abs(delta_x)));
                    rollball.push(this.int_2_binario(ultimoDelta, 8));
                    delta_x += ultimoDelta * ultimoDelta / 16;
                }
            }

            return rollball;
        }

        this.calcCoordenadaAngulo = function(phi) {
            /*
             * Traslada los valores de deltas a rotaciones.
            */
            let a = this.round_value(phi * 1024 / 90, 1);

            let cant_deltas = this.round_value((Math.abs(a) / this.cant_maxima_delta) + 1, 0);

            let delta_a = this.round_value(a / cant_deltas, 0);
            let delta_a_ultimo = this.round_value(a - (cant_deltas-1) * delta_a, 0);

            // Paso los deltas a saltos binarios
            let delta_a_bin = this.int_2_binario(delta_a, 8);
            let delta_a_ultimo_bin = this.int_2_binario(delta_a_ultimo, 8);

            let lista_delta = [];

            for (let i = 0; i < cant_deltas - 1; i++) {
                lista_delta.push(delta_a_bin);
            }
            lista_delta.push(delta_a_ultimo_bin);

            return lista_delta;
        }

        this.on_click = function (event, $this) {
            var mouse_x = event.clientX;
            var mouse_y = event.clientY;

            var radarRect = $this.get_el_coord($this.radar);

            // centro es : (radarRect['x']+radarRect['width']/2;radarRect['y']+radarRect['height']/2)
            mouse_x = 512 * (mouse_x - (radarRect['x'] + radarRect['width'] / 2)) / radarRect['width'];
            mouse_y = 512 * (radarRect['y'] + radarRect['height'] / 2 - mouse_y) / radarRect['height'];

            if (event.ctrlKey) {
                $this.rollball_DX_temp = mouse_x;
                $this.rollball_DY_temp = mouse_y;

                return; // Para que no ejecute el resto
            }
            // Si la tecla ctrl esta apretada, esta aplicando un descentrado

            if ($this.calc_module(mouse_x, mouse_y) < 256) {
                // Quite la restriccion de que el modulo sea < a 256 porque
                // no se puede hacer click afuera del radar.
                if (event.button == 0) { // Click izquierdo
                    if ($this.ROLE == "main") {
                        var delta_x = mouse_x - ($this.coordenada_rolling_L[0] - $this.origen_x) * 256 / $this.escala_DM;
                        var delta_y = mouse_y - ($this.coordenada_rolling_L[1] - $this.origen_y) * 256 / $this.escala_DM;
                    } else {
                        var delta_x = mouse_x - ($this.coordenada_rolling_R[0] - $this.origen_x) * 256 / $this.escala_DM;
                        var delta_y = mouse_y - ($this.coordenada_rolling_R[1] - $this.origen_y) * 256 / $this.escala_DM;
                    }

                    let control_var_x = $this.calc_control_var(delta_x);
                    let control_var_y = $this.calc_control_var(delta_y);

                    if ($this.ROLE == "main") {
                        $this.rollball_L_DX = control_var_x;
                        $this.rollball_L_DY = control_var_y;
                    } else {
                        $this.rollball_R_DX = control_var_x;
                        $this.rollball_R_DY = control_var_y;
                    }

                } else if (event.button == 1) { // Click central
                    var factor_x = (mouse_x - ($this.coordenada_handwheel[2] - $this.origen_x) * 256 / $this.escala_DM);
                    var factor_y = (mouse_y - ($this.coordenada_handwheel[3] - $this.origen_y) * 256 / $this.escala_DM);

                    var radio = $this.calc_module(factor_x, factor_y) * $this.escala_DM;
                    var angulo = $this.round_value(Math.atan2(factor_x, factor_y) * 180 / Math.PI, 1);

                    $this.procesoCoordenadaCursorEditAzimut(angulo);

                    $this.procesoCoordenadaCursorEditRadio(radio);
                } else if (event.button == 2) { // Click derecho
                    console.log("Click Derecho no funcionando.");
                } else {
                    // Algun tipo de error
                    console.log("ERROR: event.button inexistente");
                }
            }
        }

        this.off_click = function(event, $this) {
            if (event.ctrlKey && event.button == 0) {
                var mouse_x = event.clientX;
                var mouse_y = event.clientY;
    
                var radarRect = $this.get_el_coord($this.radar);
    
                // centro es : (radarRect['x']+radarRect['width']/2;radarRect['y']+radarRect['height']/2)
                mouse_x = 512 * (mouse_x - (radarRect['x'] + radarRect['width'] / 2)) / radarRect['width'];
                mouse_y = 512 * (radarRect['y'] + radarRect['height'] / 2 - mouse_y) / radarRect['height'];

                if ($this.ROLE == "main") {
                    $this.rollball_L_DX = $this.calc_control_var(mouse_x - $this.rollball_DX_temp);
                    $this.rollball_L_DY = $this.calc_control_var(mouse_y - $this.rollball_DY_temp);
                } else {
                    $this.rollball_R_DX = $this.calc_control_var(mouse_x - $this.rollball_DX_temp);
                    $this.rollball_R_DY = $this.calc_control_var(mouse_y - $this.rollball_DY_temp);
                }
            }
        }

        this.draw_marks_around_radar = function() {
            /*
            Funcion que dibuja las marcas alrededor del radar, para indicar los grados.
            */
            var angle_point;
        
            for(var i = 0; i < 360; i++) {
                angle_point = this.add_element(this.angle_points, "div", {"className": "angle_point"});
        
                var rect = this.get_el_coord(this.radar);
                // Obtiene coordenadas del radar
        
                angle_point.style.left = rect.x + (rect.width / 2) + "px";
                angle_point.style.top = rect.y + (rect.height / 2) + "px";
                // Primero centro en el radar, para despues aplicar las
                // modificaciones respecto al centro, y que asi puedan
                // ser facilmente aplicadas
        
                var actual_x = parseInt(angle_point.style.left.split("px")[0]);
                var actual_y = parseInt(angle_point.style.top.split("px")[0]);
        
                if (i % 10 == 0) {
                    var p = this.add_element(angle_point, "p", {});
                    p.textContent = String(i);
                    this.add_element(angle_point, "div", {"className": "center"});
        
                    var width = actual_x + (rect.width / 2) * Math.cos(this.convert_to_rad(i - 90));
                    var height = actual_y + (rect.height / 2) * Math.sin(this.convert_to_rad(i - 90)) - 12;
        
                } else if (i % 5 == 0) {
                    this.add_element(angle_point, "div", {"className": "middle"});
        
                    var width = actual_x + (rect.width / 2) * Math.cos(this.convert_to_rad(i - 90));
                    var height = actual_y + (rect.height / 2) * Math.sin(this.convert_to_rad(i - 90)) - 2;
        
                } else {
                    this.add_element(angle_point, "div", {});
        
                    var width = actual_x + (rect.width / 2) * Math.cos(this.convert_to_rad(i - 90));
                    var height = actual_y + (rect.height / 2) * Math.sin(this.convert_to_rad(i - 90));
                }
                // Agrega los elementos
                // 360 divs, cada 10 uno con la clase center, y cada 5 uno con la clase middle
        
                angle_point.style.left = width + "px";
                angle_point.style.top = height + "px";
        
                angle_point.style.transform = 'rotate(' + i + 'deg)';
                // Ubica y rota
            }
        }

        this.get_image_size = function () {
            return [
                this.std_image_size[0] * this.zoom,
                this.std_image_size[1] * this.zoom
            ];
        }

        this.draw_marks_around_radar();
    }

    plotear(x, y) {
        var last_pointer = this.add_element(this.pointer_list, "div", { "className": "pointer" });

        this.center_to_radar(x, y, last_pointer, 2, 2);
    }

    borrarPuntos() {
        /*
        Limpia ploteos anteriores
        */
        this.pointer_list.textContent = '';
        this.text_list.textContent = '';
        this.image_list.textContent = '';
        this.lines_list.textContent = '';
    }

    set_origen_x_y(lista1) {
        if (lista1.length) {
            this.origen_x = lista1[0][0];
            this.origen_y = lista1[0][1];
        }
    }

    graficar_markers(lista) {
        var bool_graf_simbolo = true;

        var x_escalado;
        var y_escalado;
        for (let i = 0; i < lista.length; i++) {
            var mostrar = false;

            x_escalado = lista[i][0] - this.origen_x;
            y_escalado = lista[i][1] - this.origen_y;

            if (lista[i][2] == "muestro") {
                mostrar = true;
            }

            var LS = lista[i][3];

            if (lista[i].length > 3) {
                var texto = "";
                var simbolo1 = "";
                var simbolo2 = "";
                var bool_graf_simbolo = true;

                for (let ii = 0; ii < lista[i][4].length; ii++) {
                    var lista_el_i_4_ii = lista[i][4][ii];
                    if (typeof lista_el_i_4_ii == 'string') {
                        texto += lista_el_i_4_ii;
                    } else if (typeof lista_el_i_4_ii == 'number') {
                        if (ii == 0 || ii == 1)
                            simbolo1 += String(lista_el_i_4_ii);
                        else if (ii == 2)
                            simbolo2 = String(lista_el_i_4_ii);
                    }
                }

                if (LS == "0") {

                    // Busco que simbolo debo dibujar. Lo tomo de la tabla
                    // de simbolos de la LPD.
                    var simbolo_png;
                    if (Object.keys(this.LPD_symbols_table).includes(simbolo1)) {
                        [simbolo_png, this.color_punto] = this.LPD_symbols_table[simbolo1];
                    } else {
                        // Este caso se da cuando no tengo una imagen png para el simbolo enviado
                        texto = "¡" + simbolo1 + texto;
                        bool_graf_simbolo = false;
                    }

                    if (texto[0] == " ") texto = texto.substring(1);
                    if (texto[0] == "+") texto = "M" + texto.substring(1); // Manual
                    else if (simbolo2 == "8") texto = "A" + texto; // Automatico
                    else if (simbolo2 == "33") texto = "E" + texto; // Estimado
                    else if (simbolo2 == "12") texto = "P" + texto; // Perdido

                    texto = " " + texto;

                    if (this.NumberTrack == false) texto = texto.substring(0, 4);
                    if (this.MainSymbol == false) bool_graf_simbolo = false;
                    if (this.LinkStatus == false)
                        texto = texto.substring(0, 3) + " " + texto.substring(4);
                    if (this.AmplInfo == false)
                        texto = texto.substring(0, 2) + " " + texto.substring(3);
                    if (this.Trakeo == false)
                        texto = texto.substring(0, 1) + " " + texto.substring(2);
                    //texto = "   " + texto;
                    texto = texto.substring(1);
                    
                } else {
                    // Simbolos con funciones alternativas
                    var simbolo_png;
                    if (Object.keys(this.AF_symbols_table).includes(simbolo1)) {
                        simbolo_png = this.AF_symbols_table[simbolo1];
                    } else {
                        // Este caso se da cuando no tengo una imagen png para el simbolo enviado
                        // texto = texto.substring(1, 2);
                        if (texto.includes("+")) {
                            texto = "+";
                        }
                        bool_graf_simbolo = false;
                    }
                }

                if (mostrar == true) {
                    this.plotear(x_escalado, y_escalado);
                }

                var [, radio] = this.xy_2_polar(x_escalado, y_escalado);
                if (radio <= 256 && texto != "") {
                    if (texto == "+") {
                        // Se agrega un offset para corregir el texto y que el signo "+" quede más centrado
                        this.graficar_texto(x_escalado + this.text_offset, y_escalado, texto, 17, 5);
                    } else {
                        // Se agrega un offset para corregir el texto y que el signo "+" quede más centrado
                        this.graficar_texto(x_escalado + this.text_offset, y_escalado, texto, 7, 7);
                    }
                }

                if (bool_graf_simbolo) {
                    var [nombre, format] = simbolo_png.split(".");
                    this.plot_imagen(x_escalado, y_escalado, nombre, format);
                }
            }
        }
    }

    graficar_texto(x, y, texto, x_delta_px=0, x_delta_py=0) {
        /*
        Grafica un texto sobre el radar en las coordenadas x e y.
        */
        var last_child = this.add_element(this.text_list, "p", {
            "className": "text",
            "textContent": texto
        });

        this.center_to_radar(x, y, last_child, x_delta_px, x_delta_py);
    }

    plot_imagen(x, y, nombre_png, format) {
        /*
        Grafica un simbolo (formato png) sobre el radar en las
        coordenadas x e y.
        */
        // var url = "images/" + format + "/" + nombre_png + "." + format;
        var url = "images/new/" + nombre_png + "." + format;

        var [width, height] = this.get_image_size();
        var last_child = this.add_element(this.image_list, "img", {
            "className": "image",
            "src": url,
            "alt": nombre_png,
            "style": "width:" + width + "px;height:" + height + "px"
        });
        //le resto el centro de la imagen, esto debido a que la imagen se
        //plotea desde la esquina superior
        this.center_to_radar(x, y, last_child,width / 2, height / 2);
    }

    graficar_linea(puntoA, puntoB, tipo_linea) {
        /*
        Grafica la linea sobre el radar. Requiere una funcion aparte
        porque en html dibujar una linea orientada se tiene que hacer
        a mano y requiere algo de calculo.

        Para darle orientacion diagonal, se dibuja una linea vertical, y se
        le asigna una rotacion. Luego, se le añade una clase, para modificar
        el tipo de linea, como si es solida, punteada, "dashed", etc.
        */

        puntoA = this.new_position(puntoA[0], puntoA[1]);
        puntoB = this.new_position(puntoB[0], puntoB[1]);
        // Recalculo la posicion de los extremos de la linea
        // Los valores de puntoB pueden llegar a ser muy grandes
        
        //console.log('puntoA:', puntoA, '\npuntoB:', puntoB);
        var radarRect = this.get_el_coord(this.radar);
        var radar_height = radarRect.height;

        var linea = this.add_element(this.lines_list, "div", { "className": "line" });

        var modulo = this.calc_module(puntoB[0] - puntoA[0], puntoB[1] - puntoA[1]);
        var angulo = this.calc_angle(puntoB[1] - puntoA[1], puntoB[0] - puntoA[0]);
        // En el calculo del angulo va primero 'y' y despues 'x'
        //console.log('modulo:',modulo,'\nangulo:',angulo);
        
        linea.style.height = modulo + "px";
        linea.style.webkitTransform = 'rotate(' + angulo + 'rad)';
        linea.style.transform = 'rotate(' + angulo + 'rad)';

        let y = (radar_height / 2) + puntoA[1];
        let x = (radar_height / 2) + puntoA[0];
        //console.log('posx:',x,'\nposy:',y);
        linea.style.bottom = y + "px";
        linea.style.left = x + "px";

        var clase_linea = this.tipos_de_linea[tipo_linea];
        linea.classList.add(clase_linea);
    }

    graficar_cursores(lista) {
        /*
        Grafica una linea definida entre dos cursores.
        */
        var leng = lista.length;
        for (let i = 0; i < leng; i++) {
            var cursor_angle = (lista[i][0]) * (Math.PI / 180);
            var cursor_length = lista[i][1];
            var tipo_linea = lista[i][2];
            var cox = lista[i][3];
            var coy = lista[i][4];

            var [Rx, Ry] = this.from_cursor_to_xy(cursor_angle, cursor_length);
            // calculo los puntos A y B y aplico el cambio de coordenadas para graficarlos
            var puntoA = [cox - this.origen_x, coy - this.origen_y];
            var puntoB = [cox + Rx - this.origen_x, coy + Ry - this.origen_y];

            this.graficar_linea(puntoA, puntoB, tipo_linea);
        }
    }

    set_range_scale(escala) {
        /*
        Modifica la escala del DM.
        */
        this.escala_DM = escala;
    }

    set_image_zoom(zoom) {
        /*
        Modifica el zoom de todas las imagenes sobre el radar,
        y las que se añadan después.
        */
        this.zoom = zoom;

        var imagenes = this.image_list.getElementsByClassName("image");
        var [width, height] = this.get_image_size();
        for (var i = 0; i < imagenes.length; i++) {
            imagenes[i].style.width = width.toString(10) + "px";
            imagenes[i].style.height = height.toString(10) + "px";
        }
    }

    apagarAnillos(estado) {
        /*
         * Funcion que borra los anillos alrededor del
         * centro sobre el radar.
         */
        if (estado) {
            this.radar.classList.add("on");
            this.radar.classList.remove("off");
        } else {
            this.radar.classList.add("off");
            this.radar.classList.remove("on");
        }
    }

    get_lista_coordenadasOBM1() {
        /*
         * Devuelve las coordenadas OBM1.
         */
        var lista_coordX = this.rollball_L_DX;
        var lista_coordY = this.rollball_L_DY;
        this.rollball_L_DX = [];
        this.rollball_L_DY = [];
        return [lista_coordX, lista_coordY];
    }

    get_lista_coordenadasOBM2() {
        /*
         * Devuelve las coordenadas OBM2.
         */
        var lista_coordX = this.rollball_R_DX;
        var lista_coordY = this.rollball_R_DY;
        this.rollball_R_DX = [];
        this.rollball_R_DY = [];
        return [lista_coordX, lista_coordY];
    }

    get_lista_coordenadasHW() {
        /*
         * Devuelve las coordenadas HW.
         */
        var lista_coordR = this.handwheel_DR;
        var lista_coordA = this.handwheel_DA;
        this.handwheel_DA = [];
        this.handwheel_DR = [];
        return [lista_coordR, lista_coordA];
    }

    obtener_coordenadas_HW(index) {
        /*
         * Devuelve una coordenada del arreglo de HW.
         */
        return this.coordenada_handwheel[index];
    }

    procesoCoordenadaCursorEditAzimut(phi) {
        /*
         * Permite modificar manualmente el azimut del cursor.
        */
        if (this.coordenada_handwheel[0] < 0)
            this.coordenada_handwheel[0] = this.coordenada_handwheel[0] + 360

        let delta_ang = phi - this.coordenada_handwheel[0];
        if (delta_ang > 180) delta_ang = delta_ang - 360;
        else if (delta_ang < -180) delta_ang = delta_ang + 360;

        this.handwheel_DA = this.calcCoordenadaAngulo(delta_ang);
    }

    procesoCoordenadaCursorEditRadio(rho) {
        /*
         * Permite modificar manualmente el radio del cursor.
        */
        let delta_r = this.round_value((rho - this.coordenada_handwheel[1] * 256) / this.escala_DM, 1);

        this.handwheel_DR = this.calc_control_var(delta_r);
    }

    setNumberTrack(estado) { this.NumberTrack = estado; }
    setMainSymbol(estado) { this.MainSymbol = estado; }
    setLinkStatus(estado) { this.LinkStatus = estado; }
    SetAmplInfo(estado) { this.AmplInfo = estado; }
    setTrakeo(estado) { this.Trakeo = estado; }
    // Setean el estado de los filtros
    setHandwheelCoordenada(coorX, coorY, phy, rho) {
        this.coordenada_handwheel[0] = phy;
        this.coordenada_handwheel[1] = rho;
        this.coordenada_handwheel[2] = coorX;
        this.coordenada_handwheel[3] = coorY;
    }
    setOBM1Coordenada(coorX, coorY) {
        this.coordenada_rolling_L[0] = coorX;
        this.coordenada_rolling_L[1] = coorY;
    }
    setOBM2Coordenada(coorX, coorY) {
        this.coordenada_rolling_R[0] = coorX;
        this.coordenada_rolling_R[1] = coorY;
    }
    set_listener() {
        /*
         * Habilita el evento para manejar el mouse.
        */
        var $this = this;
        this.radar.addEventListener('mousedown', function(event) {
            $this.on_click(event, $this);
        });
        this.radar.addEventListener("mouseup", function(event) {
            $this.off_click(event, $this);
        });
    }

}

module.exports = RadarWidget;
