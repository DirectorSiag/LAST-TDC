from dataclasses import field
import os,sys,inspect
from unicodedata import name
from PyQt5 import QtCore, QtGui, QtWidgets, uic        #uic: funcion encargada de cargar la interfaz grafica
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QLineEdit
from PyQt5.QtGui import *
from PyQt5.QtCore import *
import numpy as np
from AND_5_chica_2 import Ui_AND   #AND achicada

import screeninfo

from pynput import keyboard
from pynput.keyboard import Key #, Listener   #para manejar las entradas del teclado

class TDC_GUI(QtWidgets.QMainWindow):     #QMainWindow: ventana ya creada en el Qt Design

    def __init__(self, radar_socket, role):     #metodo que inicializa la clase

        self.radar_socket = radar_socket
        self.role = role
        # self.radar_socket.new_namespace(self.AND1, '/AND1')
        # self.radar_socket.new_namespace(self.AND2, '/AND2')
        super().__init__()

        if self.role == "main":
            uic.loadUi("TDC_3_div_left.ui", self)
        else:
            uic.loadUi("TDC_3_div_right.ui", self)

        self.screen_size = screeninfo.get_monitors()[0]

        # Hilo que maneja el teclado. Llama a la funcion self.tecla_apretada_mik cuando se presiona una tecla
        self.thread_listener = keyboard.Listener(on_press = self.tecla_apretada_mik, on_release = self.tecla_liberada_mik)
        self.thread_listener.start()

        """
        variales de la clase TDC_GUI para poder recolectar y enviar
        el estado del DCL CONC
        """
        self.range_scale = "100"        #valor inicial: 256 DM (escala maxima)
        self.radar_socket.send_message("set_range_scale(32)")
        self.disp_select_AIR = "1"
        self.disp_select_SURF = "1"
        self.disp_select_SUBSURF = "1"

        self.ref_pos = "1"
        self.bear_sel = "1"
        self.link_sel = "1"
        self.warf_sel = "1"
        self.fig = "1"

        self.threat_ass = "00100"       #valor inicial en 6 minutos
        self.mode1_L = "00"             #cu or cent off/cu or cent
        self.mode21_L = "0"             #off cent
        self.mode22_L = "01"            #cent/ reset obm
        self.mode22_R = "01"            #cent/ reset obm
        self.mode3_L = "0"              #data request
        self.true_motion = "0"          #CB1#2: true motion (bit 18)
        self.own_cursor = "0"           #own cursor(bit 17)
        self.mode1_R = "00"             #cu or cent off/cu or cent
        self.mode21_R = "0"             #off cent
        self.mode2_R = "01"            ##cent/ reset obmcent/ reset obm
        self.mode3_R = "0"
        self.syst_alarm = "0"        #CB1#2 system alarm(bit 10)
        self.radar_recorder = "0"    #CB!#2 radar recorder (bit9)
        self.mik_L = []
        self.mik_l = "01000000"
        self.mik_R = []
        self.mik_r = "01000000"
        self.qek_L = []
        self.qek_R = []
        self.icm_L = "010"
        self.overlay_L = "0011"     #inicia en overlay: AAW/AWW
        self.icm_R = "010"
        self.overlay_R = "0100"     #inicia en overlay: AIR/EW/IFF
        self.concentrator = []     #DCL enviado.

        #variables de las AND
        self.matriz_vacia = np.full((16)," "*32)        #matriz de la AND auxiliar

        self.matriz_AND1 = np.full((16)," "*32)                 #matriz de la AND1
        self.matriz_AND2 = np.full((16)," "*32)                 #matriz de la AND2

        #   ----- SETEO EL ESTADO INICIAL DE LOS BOTONES (PARTE GRAFICA) -----  #
        #self.btn_rolling_ball.setEnabled(False)     #comienzo apretado
        #self.btn_handwheel.setEnabled(True)

        # CONTROLES DIVIDIDOS
        if self.role == "main":
#ICM-L
            self.icml_btns = [
                self.btn_icml_1,
                self.btn_icml_2,
                self.btn_icml_3,
                self.btn_icml_4,
                self.btn_icml_5,
                self.btn_icml_6,
                self.btn_icml_7
            ]
            self.icml_states = [True, True, False, True, True, True, True]
            for btn_index in range(len(self.icml_btns)):
                self.button_pressed(self.icml_btns[btn_index], self.icml_states[btn_index])
#OVERLAY-L
            self.btn_overlay_btns = [
                self.btn_overlayl_1,
                self.btn_overlayl_2,
                self.btn_overlayl_3,
                self.btn_overlayl_4,
                self.btn_overlayl_5,
                self.btn_overlayl_6,
                self.btn_overlayl_7,
                self.btn_overlayl_8,
            ]
            self.btn_overlay_states = [True, True, False, True, True, True, True, True]
            self.cambioEtiquetaQEK_L("ASW")
            for btn_index in range(len(self.btn_overlay_btns)):
                self.button_pressed(self.btn_overlay_btns[btn_index], self.btn_overlay_states[btn_index])
        else:
#ICM-R
            self.icmr_btns = [
                self.btn_icmr_1,
                self.btn_icmr_2,
                self.btn_icmr_3,
                self.btn_icmr_4,
                self.btn_icmr_5,
                self.btn_icmr_6,
                self.btn_icmr_7
            ]
            self.icmr_states = [True, True, False, True, True, True, True]
            for btn_index in range(len(self.icmr_btns)):
                self.button_pressed(self.icmr_btns[btn_index], self.icmr_states[btn_index])
#OVERLAY-R
            self.btn_overlayr_btns = [
                self.btn_overlayr_1,
                self.btn_overlayr_2,
                self.btn_overlayr_3,
                self.btn_overlayr_4,
                self.btn_overlayr_5,
                self.btn_overlayr_6,
                self.btn_overlayr_7,
                self.btn_overlayr_8,
            ]
            self.btn_overlayr_states = [True, True, True, False, True, True, True, True]
            self.cambioEtiquetaQEK_R("ASW")
            for btn_index in range(len(self.btn_overlayr_btns)):
                self.button_pressed(self.btn_overlayr_btns[btn_index], self.btn_overlayr_states[btn_index])

        # CONTROLES COMPARTIDOS
#RANGE SCALE:
        self.range_scale_btns = [
            self.btn_rsl_2,
            self.btn_rsl_4,
            self.btn_rsl_8,
            self.btn_rsl_16,
            self.btn_rsl_32,
            self.btn_rsl_64,
            self.btn_rsl_128,
            self.btn_rsl_256
        ]
        self.range_scale_states = [True, True, True, True, False, True, True, True]
        for btn_index in range(len(self.range_scale_btns)):
            self.button_pressed(self.range_scale_btns[btn_index], self.range_scale_states[btn_index])
#THREAT ASSESSMENT
        self.btn_tal_btns = [
            self.btn_tal_12sec,
            self.btn_tal_30sec,
            self.btn_tal_6min,
            self.btn_tal_15min,
            self.btn_tal_reset,
        ]
        self.btn_tal_states = [False, True, True, True, True]
        for btn_index in range(len(self.btn_tal_states)):
            self.button_pressed(self.btn_tal_btns[btn_index], self.btn_tal_states[btn_index])
#   ----- SETEO QUE BOTONES MUESTRAN SI ESTAN APRETADOS O NO (PARTE GRAFICA) -----  #
#DISPLAY MODE
        self.radar_socket.send_message("apagarAnillos(false)")

#DISPLAY SELECTION
        self.btn_ds = [
            self.btn_ds_air,
            self.btn_ds_surf,
            self.btn_ds_subsurf,
            self.btn_ds_refpost,
            self.btn_ds_bearsel,
            self.btn_ds_linksel,
            self.btn_ds_warfsel,
            self.btn_ds_fig
        ]
        for btn_index in range(len(self.btn_ds)):
            self.btn_ds[btn_index].setDown(True)

#LABEL SELECTION
        self.btn_lsl = [
            self.btn_lsl_ms,
            self.btn_lsl_trkm,
            self.btn_lsl_amplinfo,
            self.btn_lsl_linkstat,
            self.btn_lsl_tn
        ]
        for btn_index in range(len(self.btn_lsl)):
            self.btn_lsl[btn_index].setDown(True)
            self.btn_lsl[btn_index].clicked.connect(lambda: self.fn_Label_Selecion(btn_index + 1))

#-------------------------------------------------------------------------------------------------------------        
#--------------------------------------------------
#conecto los botones con sus respectivas funciones:
#--------------------------------------------------
#AND1:
        if self.role == "main":
            self.btn_AND1.clicked.connect(self.fn_abrir_AND1)
#AND2:
        else:
            self.btn_AND2.clicked.connect(self.fn_abrir_AND2)

        if self.role == "main":
            self.btns_callbacks = [
#QEK_L:
                [self.btn_qekl20, [self.fn_QEK_L, 20]],
                [self.btn_qekl21, [self.fn_QEK_L, 21]],
                [self.btn_qekl22, [self.fn_QEK_L, 22]],
                [self.btn_qekl23, [self.fn_QEK_L, 23]],
                [self.btn_qekl24, [self.fn_QEK_L, 24]],
                [self.btn_qekl25, [self.fn_QEK_L, 25]],
                [self.btn_qekl26, [self.fn_QEK_L, 26]],
                [self.btn_qekl27, [self.fn_QEK_L, 27]],
                [self.btn_qekl30, [self.fn_QEK_L, 30]],
                [self.btn_qekl31, [self.fn_QEK_L, 31]],
                [self.btn_qekl32, [self.fn_QEK_L, 32]],
                [self.btn_qekl33, [self.fn_QEK_L, 33]],
                [self.btn_qekl34, [self.fn_QEK_L, 34]],
                [self.btn_qekl35, [self.fn_QEK_L, 35]],
                [self.btn_qekl36, [self.fn_QEK_L, 36]],
                [self.btn_qekl37, [self.fn_QEK_L, 37]],
                [self.btn_qekl40, [self.fn_QEK_L, 40]],
                [self.btn_qekl41, [self.fn_QEK_L, 41]],
                [self.btn_qekl42, [self.fn_QEK_L, 42]],
                [self.btn_qekl43, [self.fn_QEK_L, 43]],
                [self.btn_qekl44, [self.fn_QEK_L, 44]],
                [self.btn_qekl45, [self.fn_QEK_L, 45]],
                [self.btn_qekl46, [self.fn_QEK_L, 46]],
                [self.btn_qekl47, [self.fn_QEK_L, 47]],
                [self.btn_qekl50, [self.fn_QEK_L, 50]],
                [self.btn_qekl51, [self.fn_QEK_L, 51]],
                [self.btn_qekl52, [self.fn_QEK_L, 52]],
                [self.btn_qekl53, [self.fn_QEK_L, 53]],
                [self.btn_qekl54, [self.fn_QEK_L, 54]],
                [self.btn_qekl55, [self.fn_QEK_L, 55]],
                [self.btn_qekl56, [self.fn_QEK_L, 56]],
                [self.btn_qekl57, [self.fn_QEK_L, 57]],
#ICM_L:
                [self.btn_icml_1, [self.fn_ICM_L, 1]],
                [self.btn_icml_2, [self.fn_ICM_L, 2]],
                [self.btn_icml_3, [self.fn_ICM_L, 3]],
                [self.btn_icml_4, [self.fn_ICM_L, 4]],
                [self.btn_icml_5, [self.fn_ICM_L, 5]],
                [self.btn_icml_6, [self.fn_ICM_L, 6]],
                [self.btn_icml_7, [self.fn_ICM_L, 7]],
#DATREQ_L
                [self.btn_datreql_1, [self.fn_DATREQ1_L, 1]],
                [self.btn_datreql_2, [self.fn_DATREQ1_L, 2]],
                [self.btn_datreql_3, [self.fn_DATREQ2_L, 3]],
                [self.btn_datreql_4, [self.fn_DATREQ2_L, 4]],
                [self.btn_datreql_5, [self.fn_DATREQ2_L, 5]],
                [self.btn_datreql_6, [self.fn_DATREQ3_L, 6]],
#Overlat L
                [self.btn_overlayl_1, [self.fn_overlay_L, 1]],
                [self.btn_overlayl_2, [self.fn_overlay_L, 2]],
                [self.btn_overlayl_3, [self.fn_overlay_L, 3]],
                [self.btn_overlayl_4, [self.fn_overlay_L, 4]],
                [self.btn_overlayl_5, [self.fn_overlay_L, 5]],
                [self.btn_overlayl_6, [self.fn_overlay_L, 6]],
                [self.btn_overlayl_7, [self.fn_overlay_L, 7]],
                [self.btn_overlayl_8, [self.fn_overlay_L, 8]],
            ]
        else:
            self.btns_callbacks = [
#QEK_R:
                [self.btn_qekr20, [self.fn_QEK_R, 20]],
                [self.btn_qekr21, [self.fn_QEK_R, 21]],
                [self.btn_qekr22, [self.fn_QEK_R, 22]],
                [self.btn_qekr23, [self.fn_QEK_R, 23]],
                [self.btn_qekr24, [self.fn_QEK_R, 24]],
                [self.btn_qekr25, [self.fn_QEK_R, 25]],
                [self.btn_qekr26, [self.fn_QEK_R, 26]],
                [self.btn_qekr27, [self.fn_QEK_R, 27]],
                [self.btn_qekr30, [self.fn_QEK_R, 30]],
                [self.btn_qekr31, [self.fn_QEK_R, 31]],
                [self.btn_qekr32, [self.fn_QEK_R, 32]],
                [self.btn_qekr33, [self.fn_QEK_R, 33]],
                [self.btn_qekr34, [self.fn_QEK_R, 34]],
                [self.btn_qekr35, [self.fn_QEK_R, 35]],
                [self.btn_qekr36, [self.fn_QEK_R, 36]],
                [self.btn_qekr37, [self.fn_QEK_R, 37]],
                [self.btn_qekr40, [self.fn_QEK_R, 40]],
                [self.btn_qekr41, [self.fn_QEK_R, 41]],
                [self.btn_qekr42, [self.fn_QEK_R, 42]],
                [self.btn_qekr43, [self.fn_QEK_R, 43]],
                [self.btn_qekr44, [self.fn_QEK_R, 44]],
                [self.btn_qekr45, [self.fn_QEK_R, 45]],
                [self.btn_qekr46, [self.fn_QEK_R, 46]],
                [self.btn_qekr47, [self.fn_QEK_R, 47]],
                [self.btn_qekr50, [self.fn_QEK_R, 50]],
                [self.btn_qekr51, [self.fn_QEK_R, 51]],
                [self.btn_qekr52, [self.fn_QEK_R, 52]],
                [self.btn_qekr53, [self.fn_QEK_R, 53]],
                [self.btn_qekr54, [self.fn_QEK_R, 54]],
                [self.btn_qekr55, [self.fn_QEK_R, 55]],
                [self.btn_qekr56, [self.fn_QEK_R, 56]],
                [self.btn_qekr57, [self.fn_QEK_R, 57]],
#ICM_R:
                [self.btn_icmr_1, [self.fn_ICM_R, 1]],
                [self.btn_icmr_2, [self.fn_ICM_R, 2]],
                [self.btn_icmr_3, [self.fn_ICM_R, 3]],
                [self.btn_icmr_4, [self.fn_ICM_R, 4]],
                [self.btn_icmr_5, [self.fn_ICM_R, 5]],
                [self.btn_icmr_6, [self.fn_ICM_R, 6]],
                [self.btn_icmr_7, [self.fn_ICM_R, 7]],
#DATREQ_R
                [self.btn_datreqr_1, [self.fn_DATREQ1_R, 1]],
                [self.btn_datreqr_2, [self.fn_DATREQ1_R, 2]],
                [self.btn_datreqr_3, [self.fn_DATREQ2_R, 3]],
                [self.btn_datreqr_4, [self.fn_DATREQ2_R, 4]],
                [self.btn_datreqr_5, [self.fn_DATREQ2_R, 5]],
                [self.btn_datreqr_6, [self.fn_DATREQ3_R, 6]],
#Overlay R
                [self.btn_overlayr_1, [self.fn_overlay_R, 1]],
                [self.btn_overlayr_2, [self.fn_overlay_R, 2]],
                [self.btn_overlayr_3, [self.fn_overlay_R, 3]],
                [self.btn_overlayr_4, [self.fn_overlay_R, 4]],
                [self.btn_overlayr_5, [self.fn_overlay_R, 5]],
                [self.btn_overlayr_6, [self.fn_overlay_R, 6]],
                [self.btn_overlayr_7, [self.fn_overlay_R, 7]],
                [self.btn_overlayr_8, [self.fn_overlay_R, 8]],
            ]

        self.btns_callbacks.extend([
#TA_L:  Threat Assessment
            [self.btn_tal_12sec,    [self.fn_TA_L, 1]],
            [self.btn_tal_30sec,    [self.fn_TA_L, 2]],
            [self.btn_tal_6min,     [self.fn_TA_L, 3]],
            [self.btn_tal_15min,    [self.fn_TA_L, 4]],
            [self.btn_tal_reset,    [self.fn_TA_L, 5]],
#RS_L:  #RangeScale
            [self.btn_rsl_2,    [self.fn_RS_L, 1]],
            [self.btn_rsl_4,    [self.fn_RS_L, 2]],
            [self.btn_rsl_8,    [self.fn_RS_L, 3]],
            [self.btn_rsl_16,   [self.fn_RS_L, 4]],
            [self.btn_rsl_32,   [self.fn_RS_L, 5]],
            [self.btn_rsl_64,   [self.fn_RS_L, 6]],
            [self.btn_rsl_128,  [self.fn_RS_L, 7]],
            [self.btn_rsl_256,  [self.fn_RS_L, 8]],
#DSelect_R
            [self.btn_ds_air,       [self.fn_DSelect_R, 1]],
            [self.btn_ds_surf,      [self.fn_DSelect_R, 2]],
            [self.btn_ds_subsurf,   [self.fn_DSelect_R, 3]],
            [self.btn_ds_refpost,   [self.fn_DSelect_R, 4]],
            [self.btn_ds_bearsel,   [self.fn_DSelect_R, 5]],
            [self.btn_ds_linksel,   [self.fn_DSelect_R, 6]],
            [self.btn_ds_warfsel,   [self.fn_DSelect_R, 7]],
            [self.btn_ds_fig,       [self.fn_DSelect_R, 8]],
#DISPLAY MODES
            [self.btn_dml_hm,           [self.fn_disp_modes_L, 1]],
            [self.btn_dml_rr,           [self.fn_disp_modes_L, 2]],
            [self.btn_dml_owncursor,    [self.fn_disp_modes_L, 3]],
            [self.btn_dml_symblarge,    [self.fn_disp_modes_L, 4]],
            [self.btn_dml_tm,           [self.fn_disp_modes_L, 5]],
            [self.btn_dml_emrg,         [self.fn_disp_modes_L, 6]],
            [self.btn_dml_systalarm,    [self.fn_disp_modes_L, 7]],
# LABEL SELECTION
            [self.btn_lsl_ms,           [self.fn_Label_Selecion, 1]],
            [self.btn_lsl_trkm,         [self.fn_Label_Selecion, 2]],
            [self.btn_lsl_amplinfo,     [self.fn_Label_Selecion, 3]],
            [self.btn_lsl_linkstat,     [self.fn_Label_Selecion, 4]],
            [self.btn_lsl_tn,           [self.fn_Label_Selecion, 5]],
        ])

        self.lista_mik = [
            "00110000","00110001","00110010","00110011","00110100","00110101","00110110","00110111",
            "00111000","00111001","00101110","00100100","00101011","00101101","vacio14","vacio15",
            "vacio16","vacio17","vacio18","vacio19","01000001","01000010","01000011","01000100",
            "01000101","01000110","01000111","01001000","01001001","01001010","01001011","01001100",
            "01001101","01001110","01001111","01010000","01010001","01010010","01010011","01010100",
            "01010101","01010110","01010111","01011000","01011001","01011010","vacio46","vacio47",
            "vacio48","vacio49","00111011","00111100","00111101","00111110","00101100","00100101",
            "00100110","00100011","00100001","00100010","00100000"
        ]

        # Lista de botones con lo que no se avisa a la otra aplicacion que fueron
        # presionados. Son botones que solo trabajan del lado de la aplicacion
        # en el que fueron activados.

        # self.btn_datreql_3.released.connect(lambda: self.fn_DATREQ2_L(3)) # EXCEPCION???

        for btn_index in range(len(self.btns_callbacks)):
            widget = self.btns_callbacks[btn_index][0]
            widget.clicked.connect(lambda x, btn_index=btn_index: self.select_func(btn_index))

#diccionario QEK
        self.QEK = {20:'00010000', 21:'00010001', 22:'00010010', 23:'00010011', 24:'00010100', 25:'00010101',
                    26:'00010110', 27:'00010111', 30:'00011000', 31:'00011001', 32:'00011010', 33:'00011011',
                    34:'00011100', 35:'00011101', 36:'00011110', 37:'00011111', 40:'00100000', 41:'00100001',
                    42:'00100010', 43:'00100011', 44:'00100100', 45:'00100101', 46:'00100110', 47:'00100111',
                    50:'00101000', 51:'00101001', 52:'00101010', 53:'00101011', 54:'00101100', 55:'00101101',
                    56:'00101110', 57:'00101111', }
#diccionario escalal
        self.Escala = { "f2":1, "f3":2, "f4":3, "f5":4,
                        "f6":5, "f7":6, "f8":7, "f9":8,}
#diccionario de flag
        self.flagsLabelSelector = { "MS": True, "TRKM": True, "AMPL INFO": True,
                                    "LINK STAT": True, "TN": True}
        self.flagsDisplayMode = {   "HM": False, "RR": False, "OWN CURSOR": False,
                                    "SYMB LARGE": False, "TM": False, "EMERG": False}
        self.flagsQEKLabel = "ASW"
#hilo para mostrar la hora en la barra superior
        timer = QTimer(self)
        timer.timeout.connect(self.showtime)
        timer.start()

#envio por primera ves el estado.

        self.radar_socket.set_callback(self.receive_pc_callback)

        self.return_estado_CONC()

#-------------------------------------------------------------------------------------------------------------
#-------------------------------------------------------------------------------------------------------------
# FUNCION PARA CONFIGURAR LA POSICION DE LOS OBJETOS, SU VISIBILIDAD, ETC.
#-------------------------------------------------------------------------------------------------------------
#-------------------------------------------------------------------------------------------------------------

    def receive_pc_callback(self, msg, namespace):
        if namespace == "/DCL":
            if msg.split("|")[0] == "panel":
                index = int(msg.split("|")[1])
                callback = self.btns_callbacks[index]
                callback[1][0](callback[1][1])
                # Ejecuta la accion recibida
            elif msg.split("|")[0] == "azimut":
                print(msg)
            elif msg.split("|")[0] == "distancia":
                print(msg)
        elif namespace == "/AND1":
            self.AND1(msg)
        elif namespace == "/AND2":
            self.AND2(msg)
        else:
            if msg.split("|")[0] == "tecla_apretada_mik":
                self.tecla_apretada_mik(msg.split("|")[1])
            elif msg.split("|")[0] == "tecla_liberada_mik":
                self.tecla_liberada_mik(msg.split("|")[1])

    def select_func(self, index):
        self.btns_callbacks[index][1][0](self.btns_callbacks[index][1][1])
        if index in range(53, 81):
            # Botones compartidos
            self.radar_socket.send_message("panel|" + str(index))
        # En ambas aplicaciones, al presionar un boton, se avisa a la
        # contraparte que boton fue presionado para que actualice
        # la interfaz y sus registros

#-------------------------------------------------------------------------------------------------------------
#-------------------------------------------------------------------------------------------------------------
# FUNCION PARA CONFIGURAR LA POSICION DE LOS OBJETOS, SU VISIBILIDAD, ETC.
#-------------------------------------------------------------------------------------------------------------
#-------------------------------------------------------------------------------------------------------------

#-------------------------------------------------------------------------------------------------------------
    def showtime(self):
        datetime = QDateTime.currentDateTime()
        #text = datetime.toString(Qt.ISODate)
        text = datetime.toString("yyyy-MM-dd  hh:mm:ss")
        self.setWindowTitle("TDC ( " + text + " )")

    def button_pressed(self, button, state):
        button.setEnabled(state)

        if not state:
            button.setStyleSheet("background-color: rgb(255,0,0)")

    #---------------------------------------------------------------------------
    # aca implemento las funciones correspondientes a los botones de la tactica:
    #---------------------------------------------------------------------------

    def fn_Label_Selecion(self, boton):
        if boton == 1:
            if self.flagsLabelSelector["MS"] == True:
                self.radar_socket.send_message("setMainSymbol(false)")

                self.btn_lsl_ms.setDown(False)
                self.btn_lsl_ms.setStyleSheet("background-color: rgb(64,64,0)")
                self.flagsLabelSelector["MS"] = False
            else:
                self.radar_socket.send_message("setMainSymbol(true)")

                self.btn_lsl_ms.setDown(True)
                self.btn_lsl_ms.setStyleSheet("background-color: rgb(255,255,0)")
                self.flagsLabelSelector["MS"] = True
        if boton == 2:
            if self.flagsLabelSelector["TRKM"] == True:
                self.radar_socket.send_message("setTrakeo(false)")

                self.btn_lsl_trkm.setDown(False)
                self.btn_lsl_trkm.setStyleSheet("background-color: rgb(64,64,0)")
                self.flagsLabelSelector["TRKM"] = False
            else:
                self.radar_socket.send_message("setTrakeo(true)")

                self.btn_lsl_trkm.setDown(True)
                self.btn_lsl_trkm.setStyleSheet("background-color: rgb(255,255,0)")
                self.flagsLabelSelector["TRKM"] = True
        if boton == 3:
            if self.flagsLabelSelector["AMPL INFO"] == True:
                self.radar_socket.send_message("SetAmplInfo(false)")

                self.btn_lsl_amplinfo.setDown(False)
                self.btn_lsl_amplinfo.setStyleSheet("background-color: rgb(64,64,0)")
                self.flagsLabelSelector["AMPL INFO"] = False
            else:
                self.radar_socket.send_message("SetAmplInfo(true)")

                self.btn_lsl_amplinfo.setDown(True)
                self.btn_lsl_amplinfo.setStyleSheet("background-color: rgb(255,255,0)")
                self.flagsLabelSelector["AMPL INFO"] = True
        if boton == 4:
            if self.flagsLabelSelector["LINK STAT"] == True:
                self.radar_socket.send_message("setLinkStatus(false)")

                self.btn_lsl_linkstat.setDown(False)
                self.btn_lsl_linkstat.setStyleSheet("background-color: rgb(64,64,0)")
                self.flagsLabelSelector["LINK STAT"] = False
            else:
                self.radar_socket.send_message("setLinkStatus(true)")

                self.btn_lsl_linkstat.setDown(True)
                self.btn_lsl_linkstat.setStyleSheet("background-color: rgb(255,255,0)")
                self.flagsLabelSelector["LINK STAT"] = True
        if boton == 5:
            if self.flagsLabelSelector["TN"] == True:
                self.radar_socket.send_message("setNumberTrack(false)")

                self.btn_lsl_tn.setDown(False)
                self.btn_lsl_tn.setStyleSheet("background-color: rgb(64,64,0)")
                self.flagsLabelSelector["TN"] = False
            else:
                self.radar_socket.send_message("setNumberTrack(true)")

                self.btn_lsl_tn.setDown(True)
                self.btn_lsl_tn.setStyleSheet("background-color: rgb(255,255,0)")
                self.flagsLabelSelector["TN"] = True
#------------------------------------------------------------------------------------------------------------
    def fn_abrir_AND1(self):        #funcion para abrir la AND1
        self.And1 = QtWidgets.QWidget()

        self.ui1 = Ui_AND()
        self.ui1.setupUi(self.And1, "AND1", self.screen_size.width - 700, 35, 700, 710)
        self.fn_actualizar_AND1()
        self.And1.show()

    def fn_abrir_AND2(self):        #funcion para abrir la AND2
        self.And2 = QtWidgets.QWidget()

        self.ui2 = Ui_AND()
        self.ui2.setupUi(self.And2, "AND2", 0, 0, 700, 710)
        self.fn_actualizar_AND2()
        self.And2.show()

    def fn_actualizar_AND1(self):   #funcion que recibe la matriz AND1 de TDC_logica y actualiza la AND1
        self.ui1.retranslateUi(self.And1, self.matriz_AND1)

    def fn_actualizar_AND2(self):   #funcion que recibe la matriz AND1 de TDC_logica y actualiza la AND1
        self.ui2.retranslateUi(self.And2, self.matriz_AND2)

    def AND1(self, data):
        separacion = data.split('|')
        self.matriz_AND1[int(separacion[0])] = separacion[1]

        try:
            self.fn_actualizar_AND1()
        except:
            pass

    def AND2(self, data):
        separacion = data.split('|')
        self.matriz_AND2[int(separacion[0])] = separacion[1]

        try:
            self.fn_actualizar_AND2()
        except:
            pass

#------------------------------------------------------------------------------------------------------------    
    def and_edit_register(self, tecla, register):
        #aca van las teclas que no son letras -> flechas, espacio, excecute, etc.
        if tecla == Key.left:       #<--    space BWD
            register.append("00101100")
        elif tecla == Key.right:    #-->    space FWD
            register.append("00100110")
        elif tecla == Key.space:    #space
            #self.mik_L.append("00100001")  SEL
            register.append("00100101")
        elif tecla == Key.enter:    #enter  EXECUTE
            register.append("00100011")
        elif tecla == Key.backspace:    #borrar ERASE LINE
            register.append("00100010")
        elif tecla == Key.down:    #flecha abajo SEL
            register.append("00100000")
        elif tecla == Key.f2:       #RB
            register.append("00100100")   #044
        elif tecla == Key.f3:       #DR OBM
            register.append("00111011")   #073
        elif tecla == Key.f4:       #WIPE WARN
            register.append("00100001")   #041
        elif tecla == Key.delete:
            register.append("00111110")   #076
        else:
            #aca van las teclas que son letras. OBS: los numeros deben ser los de arriba!!
            if tecla.char and tecla.char in "0123456789+-/*":
                pass
            elif str(tecla) == "<65437>":
                tecla.char = "5"
            else:
                if tecla.vk >= 96 and tecla.vk <= 105:
                    tecla.vk = tecla.vk - 96
                if tecla.vk == 110:
                    tecla.char = '.'

            tecla = str(tecla)
            if len(tecla) == 3:
                tecla = tecla[1]

            tecla = tecla.upper()
            tecla_ord = ord(tecla)
            if tecla_ord>32 and tecla_ord<91:
                letra_bin = ''.join(format(tecla_ord, '08b'))
            else:       #la tecla ingresada no corresponde al MIK:
                letra_bin = "01000000"  #"01000000": ninguna tecla fue apretada

            register.append(letra_bin)

    def tecla_apretada_mik(self, tecla):  #metodo que es llamado por la clase TDC_logica para pasar la tecla apretada (ya en binario)
        try:
            if type(tecla) == str:
                """
                Se colocan todos los accesos directos para la pantalla principal estando en una
                instancia de la ventana de Electron.

                Para este metodo, la tecla recibida es una cadena. Para los demas es un objeto.
                """
                if tecla == "d":       #<--    space
                    self.mode3_L = "1" #data request
                    self.mode3_R = "1"
                elif tecla == "ctrl_l":# and self.mode21_L == '0':
                    self.mode21_L = "1"
                    self.mode21_R = "1"
                    # self.RadarWidget.offCenterPress(True)
                elif tecla == "shift_l":
                    self.mode1_L = '10'
                    self.mode1_R = '10'
                # elif self.Escala.get(tecla) != None:
                    # self.fn_RS_L(self.Escala[tecla])
                elif tecla in ["1", "2", "3", "4", "5", "6", "7", "8"]:
                    self.fn_RS_L(int(tecla))
                elif self.flagsQEKLabel != "AAW" and self.flagsQEKLabel != "OPS":
                    try:
                        if tecla == 'c':
                            self.qek_L.append(self.QEK[37])
                        elif tecla == 'x':
                            self.qek_L.append(self.QEK[36])
                        elif tecla == 'w':
                            self.qek_L.append(self.QEK[57])
                        elif self.flagsQEKLabel != "ASW" and self.flagsQEKLabel != "EW":
                            if tecla == 'z':
                                self.qek_L.append(self.QEK[35])
                    except:
                        pass
                self.return_estado_CONC()

            elif self.role == "main" and self.And1.isActiveWindow(): #se filtra cuando la ventana AND1 esta como foco
                self.and_edit_register(tecla, self.mik_L)
                self.return_estado_CONC()

            elif self.role == "pc2" and self.And2.isActiveWindow(): #se filtra cuando la ventana AND1 esta como foco
                self.and_edit_register(tecla, self.mik_R)
                self.return_estado_CONC()

        except (AttributeError, TypeError):  #si la AND no esta abierta, no tiene sentido que se ingresen las teclas.
                #print("No abierta")
                pass

    def tecla_liberada_mik(self, tecla):  #metodo que es llamado por la clase TDC_logica para pasar la tecla liberada
        try:
            if tecla == "ctrl_l" or tecla == Key.ctrl_l:
                #self.RadarWidget.offCenterPress(False)
                self.mode21_L = '0'
                self.mode21_R = '0'
                self.return_estado_CONC()
        except:
            pass
#------------------------------------------------------------------------------------------------------------   
    def return_estado_CONC(self):           #armo la palabra con el estado del CONC
        palabra = ""
#----------WORD 1----------
        palabra += self.range_scale + self.disp_select_AIR + self.disp_select_SURF + self.disp_select_SUBSURF + self.ref_pos + self.bear_sel + self.link_sel + self.warf_sel + self.fig + self.threat_ass + "00000000,"

#----------WORD 2----------000010
        palabra += self.mode1_L + self.mode21_L + self.mode22_L + self.mode3_L + self.true_motion + self.own_cursor + self.mode1_R + self.mode21_R + self.mode22_R + self.mode3_R + self.syst_alarm + self.radar_recorder + "00000000,"
        self.mode1_L = "00"
        self.mode22_L = "00"
        self.mode3_L = "0"
        self.mode1_R = "00"
        self.mode22_R = "00"
        self.mode3_R = "0"
        self.syst_alarm = "0"   #como es pulsador, una vez que envio su estado, lo seteo en 0.
        self.mode21_L = "0"
        self.mode21_R = "0"

#----------WORD 3----------
        if len(self.mik_L) == 0:      #si la lista de caracteres apretados esta vacia: devolver no key pressed (100 en octal)
            self.mik_l = "01000000"
        else:       #si no esta vacia, devuelvo el valor de la tecla apretada y la borro de la lista
            self.mik_l = self.mik_L[0]
            del(self.mik_L[0])      #elimino la letra de la lista

        if len(self.mik_R) == 0:      #si la lista de caracteres apretados esta vacia: devolver no key pressed (100 en octal)
            self.mik_r = "01000000"
        else:       #si no esta vacia, devuelvo el valor de la tecla apretada y la borro de la lista
            self.mik_r = self.mik_R[0]
            del(self.mik_R[0])      #elimino la letra de la lista

        palabra += self.mik_l + self.mik_r + "00000000,"

#----------WORD 4----------
        if len(self.qek_L) == 0:        #si la lista esta vacia, no se presiono ningun qek
            self.qek_l = "00000000"
        else:                           #sino, envio la primera tecla de la lista y la elimino de la lista
            self.qek_l = self.qek_L[0]
            del(self.qek_L[0])

        if len(self.qek_R) == 0:        #si la lista esta vacia, no se presiono ningun qek
            self.qek_r = "00000000"
        else:                           #sino, envio la primera tecla de la lista y la elimino de la lista
            self.qek_r = self.qek_R[0]
            del(self.qek_R[0])

        palabra += self.qek_l + self.qek_r + "00000000,"

#----------WORD 5----------
        palabra += self.icm_L + "0" + self.overlay_L + self.icm_R + "0" + self.overlay_R + "00000000,"

#----------WORD 6----------
                #handwheel A + handwheel R
        palabra += "00000000" + "00000000" + "00000000,"

#----------WORD 7----------
                  #ROLL L X  + ROLL L Y
        palabra += "00000000" + "00000000" + "00000000,"

#----------WORD 8----------
                  #ROLL R X  + ROLL R Y
        palabra += "00000000" + "00000000" + "00000000,"

#----------WORD 9----------
        palabra += "000000000000000000000000"    #palabra de status

        self.concentrator = palabra
        self.radar_socket.send_message(self.concentrator, "/DCL")

#-----------------------------------------------------------------------#

    #---------------------------------------------------------------#
    #                     METODOS DE LOS BOTONES                    #
    #---------------------------------------------------------------#
#----------WORD 1----------        

    #RANGE SCALE
    def fn_RS_L (self, boton):

        self.btn_rsl_2.setStyleSheet("background-color: rgb(255,150,64)")
        self.btn_rsl_4.setStyleSheet("background-color: rgb(255,150,64)")
        self.btn_rsl_8.setStyleSheet("background-color: rgb(255,150,64)")
        self.btn_rsl_16.setStyleSheet("background-color: rgb(255,150,64)")
        self.btn_rsl_32.setStyleSheet("background-color: rgb(255,150,64)")
        self.btn_rsl_64.setStyleSheet("background-color: rgb(255,150,64)")
        self.btn_rsl_128.setStyleSheet("background-color: rgb(255,150,64)")
        self.btn_rsl_256.setStyleSheet("background-color: rgb(255,150,64)")

        self.btn_rsl_2.setEnabled(True)
        self.btn_rsl_4.setEnabled(True)
        self.btn_rsl_8.setEnabled(True)
        self.btn_rsl_16.setEnabled(True)
        self.btn_rsl_32.setEnabled(True)
        self.btn_rsl_64.setEnabled(True)
        self.btn_rsl_128.setEnabled(True)
        self.btn_rsl_256.setEnabled(True)

        if boton == 1:      #2DM
            palabra = '000'
            self.radar_socket.send_message("set_range_scale(2)")     #seteo el valor de escala en el radar para poder graficar

            self.btn_rsl_2.setEnabled(False)
            self.btn_rsl_2.setStyleSheet("background-color: rgb(255,0,0)")

        elif boton == 2:    #4DM
            palabra = '001'
            self.radar_socket.send_message("set_range_scale(4)")

            self.btn_rsl_4.setEnabled(False)
            self.btn_rsl_4.setStyleSheet("background-color: rgb(255,0,0)")

        elif boton == 3:    #8DM
            palabra = '010'
            self.radar_socket.send_message("set_range_scale(8)")

            self.btn_rsl_8.setEnabled(False)
            self.btn_rsl_8.setStyleSheet("background-color: rgb(255,0,0)")

        elif boton == 4:    #16DM
            palabra = '011'
            self.radar_socket.send_message("set_range_scale(16)")

            self.btn_rsl_16.setEnabled(False)
            self.btn_rsl_16.setStyleSheet("background-color: rgb(255,0,0)")

        elif boton == 5:    #32DM
            palabra = '100'
            self.radar_socket.send_message("set_range_scale(32)")

            self.btn_rsl_32.setEnabled(False)
            self.btn_rsl_32.setStyleSheet("background-color: rgb(255,0,0)")

        elif boton == 6:    #64DM
            palabra = '101'
            self.radar_socket.send_message("set_range_scale(64)")

            self.btn_rsl_64.setEnabled(False)
            self.btn_rsl_64.setStyleSheet("background-color: rgb(255,0,0)")

        elif boton == 7:    #128DM
            palabra = '110'
            self.radar_socket.send_message("set_range_scale(128)")

            self.btn_rsl_128.setEnabled(False)
            self.btn_rsl_128.setStyleSheet("background-color: rgb(255,0,0)")

        else:               #256DM
            palabra = '111'
            self.radar_socket.send_message("set_range_scale(256)")

            self.btn_rsl_256.setEnabled(False)
            self.btn_rsl_256.setStyleSheet("background-color: rgb(255,0,0)")
        self.range_scale = palabra
        self.return_estado_CONC()

    #DISPLAY SELECTION
    """
    AIR-SURF-SUB SURF-ELECTRONIC WAR-NAV AIDS-BLINDS ARCS-BLIND ARCS STEP-LPD TEST
    """
    def fn_DSelect_R (self, boton):
        if boton == 1:
            if self.disp_select_AIR == "1":
                self.btn_ds_air.setStyleSheet("background-color: rgb(0, 64, 0)")
                self.disp_select_AIR = "0"
                self.btn_ds_air.setDown(False)
            else:
                self.disp_select_AIR = "1"
                self.btn_ds_air.setStyleSheet("background-color: rgb(0, 255, 0)")
                self.btn_ds_air.setDown(True)
        elif boton == 2:
            if self.disp_select_SURF == "1":
                self.disp_select_SURF = "0"
                self.btn_ds_surf.setStyleSheet("background-color: rgb(0, 64, 0)")
                self.btn_ds_surf.setDown(False)
            else:
                self.disp_select_SURF = "1"
                self.btn_ds_surf.setStyleSheet("background-color: rgb(0, 255, 0)")
                self.btn_ds_surf.setDown(True)
        elif boton == 3:
            if self.disp_select_SUBSURF == "1":
                self.disp_select_SUBSURF = "0"
                self.btn_ds_subsurf.setStyleSheet("background-color: rgb(0, 64, 0)")
                self.btn_ds_subsurf.setDown(False)
            else:
                self.disp_select_SUBSURF = "1"
                self.btn_ds_subsurf.setStyleSheet("background-color: rgb(0, 255, 0)")
                self.btn_ds_subsurf.setDown(True)
        elif boton == 4:
            if self.ref_pos == "1":
                self.ref_pos = "0"
                self.btn_ds_refpost.setStyleSheet("background-color: rgb(0, 64, 0)")
                self.btn_ds_refpost.setDown(False)
            else:
                self.ref_pos = "1"
                self.btn_ds_refpost.setStyleSheet("background-color: rgb(0, 255, 0)")
                self.btn_ds_refpost.setDown(True)
        elif boton == 5:
            if self.bear_sel == "1":
                self.bear_sel = "0"
                self.btn_ds_bearsel.setStyleSheet("background-color: rgb(0, 64, 0)")
                self.btn_ds_bearsel.setDown(False)
            else:
                self.bear_sel = "1"
                self.btn_ds_bearsel.setStyleSheet("background-color: rgb(0, 255, 0)")
                self.btn_ds_bearsel.setDown(True)
        elif boton == 6:
            if self.link_sel == "1":
                self.link_sel = "0"
                self.btn_ds_linksel.setStyleSheet("background-color: rgb(0, 64, 0)")
                self.btn_ds_linksel.setDown(False)
            else:
                self.link_sel = "1"
                self.btn_ds_linksel.setStyleSheet("background-color: rgb(0, 255, 0)")
                self.btn_ds_linksel.setDown(True)
        elif boton == 7:
            if self.warf_sel == "1":
                self.warf_sel = "0"
                self.btn_ds_warfsel.setStyleSheet("background-color: rgb(0, 64, 0)")
                self.btn_ds_warfsel.setDown(False)
            else:
                self.warf_sel = "1"
                self.btn_ds_warfsel.setStyleSheet("background-color: rgb(0, 255, 0)")
                self.btn_ds_warfsel.setDown(True)
        else:       #boton == 8
            if self.fig == "1":
                self.fig = "0"
                self.btn_ds_fig.setStyleSheet("background-color: rgb(0, 64, 0)")
                self.btn_ds_fig.setDown(False)
            else:
                self.fig = "1"
                self.btn_ds_fig.setStyleSheet("background-color: rgb(0, 255, 0)")
                self.btn_ds_fig.setDown(True)
        self.return_estado_CONC()

    #THREAT ASSESSMENT
    def fn_TA_L (self, boton):

        self.btn_tal_12sec.setEnabled(True)
        self.btn_tal_30sec.setEnabled(True)
        self.btn_tal_6min.setEnabled(True)
        self.btn_tal_15min.setEnabled(True)
        self.btn_tal_reset.setEnabled(True)

        self.btn_tal_12sec.setStyleSheet("background-color: rgb(0, 64, 0)")
        self.btn_tal_30sec.setStyleSheet("background-color: rgb(0, 64, 0)")
        self.btn_tal_6min.setStyleSheet("background-color: rgb(0, 64, 0)")
        self.btn_tal_15min.setStyleSheet("background-color: rgb(0, 64, 0)")
        self.btn_tal_reset.setStyleSheet("background-color: rgb(0, 64, 0)")

        if boton == 1:      #12 sec
            palabra = '10000'
            self.btn_tal_12sec.setEnabled(False)
            self.btn_tal_12sec.setStyleSheet("background-color: rgb(0, 255, 0)")
        elif boton == 2:    #30sec
            palabra = '01000'
            self.btn_tal_30sec.setEnabled(False)
            self.btn_tal_30sec.setStyleSheet("background-color: rgb(0, 255, 0)")
        elif boton == 3:    #6min
            palabra = '00100'
            self.btn_tal_6min.setEnabled(False)
            self.btn_tal_6min.setStyleSheet("background-color: rgb(0, 255, 0)")
        elif boton == 4:    #15min
            palabra = '00010'
            self.btn_tal_15min.setEnabled(False)
            self.btn_tal_15min.setStyleSheet("background-color: rgb(0, 255, 0)")
        else:   #boton 5 -> RESET
            palabra = '00001'
            self.btn_tal_reset.setEnabled(False)
            self.btn_tal_reset.setStyleSheet("background-color: rgb(0, 255, 0)")
        self.threat_ass = palabra
        self.return_estado_CONC()

#----------WORD 2----------
    #DISPLAY MODE LEFT
    def fn_DATREQ1_L (self, boton):
        palabra1 = '00'     #own cursor control:
        if boton == 1:
            palabra1 = '10'
        elif boton == 2:
            palabra1 = '01'
        self.mode1_L = palabra1
        self.return_estado_CONC()

    def fn_DATREQ2_L (self, boton):
        palabra2 = '00'    #rolling ball control:
        if boton == 3:
            self.mode21_L = "1"
            # if self.btn_datreql_3.isDown():      #si el boton OFF CENT esta apretado, mando un uno y lo mantengo, sino mando 0
            #     self.mode21_L = "1"
            # else:
            #     self.mode21_L = "0"
        elif boton == 4:
            palabra2 = '10'
        elif boton == 5: #boton RESET OBM
            palabra2 = '01'
        self.mode22_L = palabra2
        self.return_estado_CONC()

    def fn_DATREQ3_L (self, boton):
        palabra3 = "0"      #dat request
        if boton == 6:
            palabra3 = "1"
        self.mode3_L = palabra3
        self.return_estado_CONC()

    def fn_disp_modes_L(self, boton):
        if boton == 1:
            if self.flagsDisplayMode["HM"] == False:
                self.btn_dml_hm.setStyleSheet("background-color: rgb(255, 255, 0)")
                self.btn_dml_hm.setDown(True)
                self.flagsDisplayMode["HM"] = True
            else:
                self.btn_dml_hm.setStyleSheet("background-color: rgb(64, 64,0)")
                self.btn_dml_hm.setDown(False)
                self.flagsDisplayMode["HM"] = False
        if boton == 2:
            if self.flagsDisplayMode["RR"] == False:
                self.radar_socket.send_message("apagarAnillos(true)")

                self.btn_dml_rr.setStyleSheet("background-color: rgb(255, 255, 0)")
                self.btn_dml_rr.setDown(True)
                self.flagsDisplayMode["RR"] = True
            else:
                self.radar_socket.send_message("apagarAnillos(false)")

                self.btn_dml_rr.setStyleSheet("background-color: rgb(64, 64,0)")
                self.btn_dml_rr.setDown(False)
                self.flagsDisplayMode["RR"] = False
        elif boton == 3:
            if self.own_cursor == "1":
                self.btn_dml_owncursor.setStyleSheet("background-color: rgb(64, 64, 0)")
                self.btn_dml_owncursor.setDown(False)
                self.own_cursor = "0"
            else:
                self.own_cursor = "1"
                self.btn_dml_owncursor.setStyleSheet("background-color: rgb(255, 255,0)")
                self.btn_dml_owncursor.setDown(True)
        elif boton == 4:    #symbol large
            if self.flagsDisplayMode["SYMB LARGE"] == False:
                self.radar_socket.send_message("set_image_zoom(0.2)")
                #self.radar_socket.send_message("set_text_zoom(11)")

                self.btn_dml_symblarge.setStyleSheet("background-color: rgb(255, 255,0)")
                self.btn_dml_symblarge.setDown(True)
                self.flagsDisplayMode["SYMB LARGE"] = True
            else:
                self.radar_socket.send_message("set_image_zoom(0.15)")
                #self.radar_socket.send_message("set_text_zoom(9)")

                self.btn_dml_symblarge.setStyleSheet("background-color: rgb(64, 64,0)")
                self.btn_dml_symblarge.setDown(False)
                self.flagsDisplayMode["SYMB LARGE"] = False
        elif boton == 5:
            if self.true_motion == "1":
                self.true_motion = "0"
                self.btn_dml_tm.setStyleSheet("background-color: rgb(64, 64,0)")
                self.btn_dml_tm.setDown(False)
            else:
                self.true_motion = "1"
                self.btn_dml_tm.setStyleSheet("background-color: rgb(255, 255,0)")
                self.btn_dml_tm.setDown(True)
        elif boton == 6:    #symbol large
            if self.flagsDisplayMode["EMERG"] == False:
                self.btn_dml_emrg.setStyleSheet("background-color: rgb(255, 255,0)")
                self.btn_dml_emrg.setDown(True)
                self.flagsDisplayMode["EMERG"] = True
            else:
                self.btn_dml_emrg.setStyleSheet("background-color: rgb(64, 64,0)")
                self.btn_dml_emrg.setDown(False)
                self.flagsDisplayMode["EMERG"] = False
        elif boton == 7:
            self.syst_alarm = "1"
        self.return_estado_CONC()

    def fn_DATREQ1_R (self, boton):
        palabra1 = '00'     #own cursor control:
        if boton == 1:
            palabra1 = '10'
        elif boton == 2:
            palabra1 = '01'
        self.mode1_R = palabra1
        self.return_estado_CONC()

    def fn_DATREQ2_R (self, boton):
        palabra2 = '00'    #rolling ball control:  
        if boton == 3:
            self.mode21_R = "1"
            # if self.btn_datreqr_3.isChecked():      #si el boton OFF CENT esta apretado, mando un uno y lo mantengo, sino mando 0
            #     self.mode21_R = "1"
            # else:
            #     self.mode21_R = "0"
        elif boton == 4:
            palabra2 = '10'
        elif boton == 5: #boton RESET OBM
            palabra2 = '01'
        self.mode22_R = palabra2
        self.return_estado_CONC()

    def fn_DATREQ3_R (self, boton):
        palabra3 = '0'      #dat request
        if boton == 6:
            palabra3 = '1'
        self.mode3_R = palabra3
        self.return_estado_CONC()

#----------WORD 3----------

#----------WORD 4----------
    #QEK-L
    def fn_QEK_L (self, boton):
        self.qek_L.append(self.QEK[boton])
        self.return_estado_CONC()
    #QEK-R 
    def fn_QEK_R (self, boton):
        self.qek_R.append(self.QEK[boton])
        self.return_estado_CONC()

#----------WORD 5----------
    #ICM-L
    def fn_ICM_L (self, boton):

        self.btn_icml_1.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icml_2.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icml_3.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icml_4.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icml_5.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icml_6.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icml_7.setStyleSheet("background-color: rgb(97, 153, 101)")

        self.btn_icml_1.setEnabled(True)
        self.btn_icml_2.setEnabled(True)
        self.btn_icml_3.setEnabled(True)
        self.btn_icml_4.setEnabled(True)
        self.btn_icml_5.setEnabled(True)
        self.btn_icml_6.setEnabled(True)
        self.btn_icml_7.setEnabled(True)

        if boton == 1:
            palabra = '000'

            self.btn_icml_1.setEnabled(False)
            self.btn_icml_1.setStyleSheet("background-color: rgb(0, 255, 0)")

        elif boton == 2:
            palabra = '001'

            self.btn_icml_2.setEnabled(False)
            self.btn_icml_2.setStyleSheet("background-color: rgb(0, 255, 0)")

        elif boton == 3:
            palabra = '010'

            self.btn_icml_3.setEnabled(False)
            self.btn_icml_3.setStyleSheet("background-color: rgb(0, 255, 0)")

        elif boton == 4:
            palabra = '011'

            self.btn_icml_4.setEnabled(False)
            self.btn_icml_4.setStyleSheet("background-color: rgb(0, 255, 0)")

        elif boton == 5:
            palabra = '100'

            self.btn_icml_5.setEnabled(False)
            self.btn_icml_5.setStyleSheet("background-color: rgb(0, 255, 0)")

        elif boton == 6:
            palabra = '101'

            self.btn_icml_6.setEnabled(False)
            self.btn_icml_6.setStyleSheet("background-color: rgb(0, 255, 0)")

        else: #boton == 7
            palabra = '110'

            self.btn_icml_7.setEnabled(False)
            self.btn_icml_7.setStyleSheet("background-color: rgb(0, 255, 0)")
        self.icm_L = palabra
        self.return_estado_CONC()

    #OVERLAY-L
    def fn_overlay_L (self, boton):

        self.btn_overlayl_1.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayl_2.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayl_3.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayl_4.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayl_5.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayl_6.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayl_7.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayl_8.setStyleSheet("background-color: rgb(158, 225, 86)")

        self.btn_overlayl_1.setEnabled(True)
        self.btn_overlayl_2.setEnabled(True)
        self.btn_overlayl_3.setEnabled(True)
        self.btn_overlayl_4.setEnabled(True)
        self.btn_overlayl_5.setEnabled(True)
        self.btn_overlayl_6.setEnabled(True)
        self.btn_overlayl_7.setEnabled(True)
        self.btn_overlayl_8.setEnabled(True)

        if boton == 1:          #AAW/AWW    superficie
            palabra = "0001"

            self.btn_overlayl_1.setEnabled(False)
            self.btn_overlayl_1.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_L("SPC")

        elif boton == 2:        #ASW    aire superficie- helicoptero
            palabra = "0010"

            self.btn_overlayl_2.setEnabled(False)
            self.btn_overlayl_2.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_L("HECO")

        elif boton == 3:        #AIR/EW/IFF submarino y torpedo
            palabra = "0011"


            self.btn_overlayl_3.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_L("ASW")

        elif boton == 4:   #boton == 4     #SURFACE    canales de fuego
            palabra = "0100"

            self.btn_overlayl_4.setEnabled(False)
            self.btn_overlayl_4.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_L("OPS")

        elif boton == 5:        #    aire
            palabra = "0101"

            self.btn_overlayl_5.setEnabled(False)
            self.btn_overlayl_5.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_L("APC")

        elif boton == 6:        #aire superficie
            palabra = "0110"

            self.btn_overlayl_6.setEnabled(False)
            self.btn_overlayl_6.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_L("LINCO")

        elif boton == 7:        #canales de fuego - ambientes
            palabra = "0111"

            self.btn_overlayl_7.setEnabled(False)
            self.btn_overlayl_7.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_L("AAW")

        else:        #boton 8 -> canales de fuego, punto data de guerra electronica
            palabra = "1000"

            self.btn_overlayl_8.setEnabled(False)
            self.btn_overlayl_8.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_L("EW")

        self.overlay_L = palabra
        self.return_estado_CONC()

    #ICM-R
    def fn_ICM_R (self, boton):

        self.btn_icmr_1.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icmr_2.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icmr_3.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icmr_4.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icmr_5.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icmr_6.setStyleSheet("background-color: rgb(97, 153, 101)")
        self.btn_icmr_7.setStyleSheet("background-color: rgb(97, 153, 101)")

        self.btn_icmr_1.setEnabled(True)
        self.btn_icmr_2.setEnabled(True)
        self.btn_icmr_3.setEnabled(True)
        self.btn_icmr_4.setEnabled(True)
        self.btn_icmr_5.setEnabled(True)
        self.btn_icmr_6.setEnabled(True)
        self.btn_icmr_7.setEnabled(True)

        if boton == 1:
            palabra = '000'

            self.btn_icmr_1.setEnabled(False)
            self.btn_icmr_1.setStyleSheet("background-color: rgb(0, 255, 0)")

        elif boton == 2:
            palabra = '001'

            self.btn_icmr_2.setEnabled(False)
            self.btn_icmr_2.setStyleSheet("background-color: rgb(0, 255, 0)")

        elif boton == 3:
            palabra = '010'

            self.btn_icmr_3.setEnabled(False)
            self.btn_icmr_3.setStyleSheet("background-color: rgb(0, 255, 0)")

        elif boton == 4:
            palabra = '011'

            self.btn_icmr_4.setEnabled(False)
            self.btn_icmr_4.setStyleSheet("background-color: rgb(0, 255, 0)")

        elif boton == 5:
            palabra = '100'

            self.btn_icmr_5.setEnabled(False)
            self.btn_icmr_5.setStyleSheet("background-color: rgb(0, 255, 0)")

        elif boton == 6:
            palabra = '101'

            self.btn_icmr_6.setEnabled(False)
            self.btn_icmr_6.setStyleSheet("background-color: rgb(0, 255, 0)")

        else: #boton == 7
            palabra = '110'

            self.btn_icmr_7.setEnabled(False)
            self.btn_icmr_7.setStyleSheet("background-color: rgb(0, 255, 0)")

        self.icm_R = palabra
        self.return_estado_CONC()

    #OVERLAY-R
    def fn_overlay_R (self, boton):

        self.btn_overlayr_1.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayr_2.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayr_3.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayr_4.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayr_5.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayr_6.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayr_7.setStyleSheet("background-color: rgb(158, 225, 86)")
        self.btn_overlayr_8.setStyleSheet("background-color: rgb(158, 225, 86)")

        self.btn_overlayr_1.setEnabled(True)
        self.btn_overlayr_2.setEnabled(True)
        self.btn_overlayr_3.setEnabled(True)
        self.btn_overlayr_4.setEnabled(True)
        self.btn_overlayr_5.setEnabled(True)
        self.btn_overlayr_6.setEnabled(True)
        self.btn_overlayr_7.setEnabled(True)
        self.btn_overlayr_8.setEnabled(True)

        if boton == 1:          #AAW/AWW    superficie
            palabra = "0001"

            self.btn_overlayr_1.setEnabled(False)
            self.btn_overlayr_1.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_R("SPC")

        elif boton == 2:        #ASW    aire superficie- helicoptero
            palabra = "0010"

            self.btn_overlayr_2.setEnabled(False)
            self.btn_overlayr_2.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_R("HECO")

        elif boton == 3:        #AIR/EW/IFF submarino y torpedo
            palabra = "0011"

            self.btn_overlayr_3.setEnabled(False)
            self.btn_overlayr_3.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_R("ASW")

        elif boton == 4:   #boton == 4     #SURFACE    canales de fuego
            palabra = "0100"

            self.btn_overlayr_4.setEnabled(False)
            self.btn_overlayr_4.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_R("OPS")

        elif boton == 5:        #    aire
            palabra = "0101"

            self.btn_overlayr_5.setEnabled(False)
            self.btn_overlayr_5.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_R("APC")

        elif boton == 6:        #aire superficie
            palabra = "0110"

            self.btn_overlayr_6.setEnabled(False)
            self.btn_overlayr_6.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_R("LINCO")

        elif boton == 7:        #canales de fuego - ambientes
            palabra = "0111"

            self.btn_overlayr_7.setEnabled(False)
            self.btn_overlayr_7.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_R("AAW")

        else:        #boton 8 -> canales de fuego, punto data de guerra electronica
            palabra = "1000"

            self.btn_overlayr_8.setEnabled(False)
            self.btn_overlayr_8.setStyleSheet("background-color: rgb(255, 0, 0)")
            self.cambioEtiquetaQEK_R("EW")

        self.overlay_R = palabra
        self.return_estado_CONC()

#----------WORD 6----------
    #HANDWHEEL delta PHI --> implementado mas arriba

    #HANDWHEEL delta RHO --> implementado mas arriba

#----------WORD 7----------
    #ROLLING BALL-L: delta X --> implementado mas arriba

    #ROLLING BALL-L: delta Y --> implementado mas arriba

#----------WORD 8----------
    #ROLLING BALL-R: delta X --> implementado mas arriba

    #ROLLING BALL-R: delta Y --> implementado mas arriba
#--------------------------
    def cambioEtiquetaQEK_L(self,ambiente):
        self.flagsQEKLabel = ambiente
        if ambiente == "AAW":
            self.QEK_L_1.setText("                                                                    ")
            self.QEK_L_2.setText("   |-------FC1-------|       |-----------FC5-----------|            ")
            self.QEK_L_3.setText(" DESIG    BREAK    HOLD    DESIG    SLAVE    BREAK    HOLD     STOP ")

            self.QEK_L_4.setText("         TRACK    FIRE                      TRACK    FIRE   FIRE INH")
            self.QEK_L_5.setText("   |-------FC2------|        |-----------FC6-----------|            ")
            self.QEK_L_6.setText(" DESIG    BREAK    HOLD    DESIG    SLAVE   BREAK    HOLD           ")

            self.QEK_L_7.setText("         TRACK    FIRE                      TRACK    FIRE           ")
            self.QEK_L_8.setText("   |-----------ECM-----------|          CHAFF                       ")
            self.QEK_L_9.setText(" DESIG    BREAK   START    STOP    ASSIGN    DEASS    IFF    THREAT ")

            self.QEK_L_10.setText("          TRACK    JAM      JAM                     ACT DEC   ASSES ")
            self.QEK_L_11.setText("    |----------------EXOCET--------------------|                    ")
            self.QEK_L_12.setText(" ASSIGN   DEASS    INIT    TERM     CHECK   CHANGE   BLIND    NEXT  ")

            self.QEK_L_13.setText("                  RECOMM   RECOMM  UNW TGT LCH SIDE   ARCS    ARCS  ")

        elif ambiente == "APC":
            self.QEK_L_1.setText("   |------------INITIATE-------------|                              ")
            self.QEK_L_2.setText("   |-----------AIR-----------|                                      ")
            self.QEK_L_3.setText(" AUTO      RAM      DR     VISUAL    RP                             ")

            self.QEK_L_4.setText("                          BEARING                                   ")
            self.QEK_L_5.setText("   |------------ASSIGN----------------|                             ")
            self.QEK_L_6.setText(" AUTO     RAM       DR      LOST     LRO     NEXT    CORRECT  CLOSE ")

            self.QEK_L_7.setText("                                             TRACK           CONTROL")
            self.QEK_L_8.setText("   |-----------------------IDENTITY--------------------|            ")
            self.QEK_L_9.setText("PENDING   POSS     POSS     CONF    CONF     EVAL     HELI           ")

            self.QEK_L_10.setText("         HOSTILE FRIEND   HOSTILE   FRIEN   UNKNOWN                 ")
            self.QEK_L_11.setText("   |-----------------LINK Y--------------------|                    ")
            self.QEK_L_12.setText("ASSIGN    DEASS    CORR    DECORR          INITIATE  ASSIGN   WIPE  ")

            self.QEK_L_13.setText("                                             AUTO     AUTO          ")

        elif ambiente == "ASW":
            self.QEK_L_1.setText("   |------------------INITIATE-----------------|                    ")
            self.QEK_L_2.setText("   |---SUBSURFACE---|                 |---ESM--|         ASSIGN     ")
            self.QEK_L_3.setText("  DR     DATUM    ACOUST     RP    BEARING    FIX     LOST     LRO  ")

            self.QEK_L_4.setText("                BEARING                                             ")
            self.QEK_L_5.setText("   |-----------------IDENTITY-----------------|                     ")
            self.QEK_L_6.setText("PENDING   POSS     POSS     CONF     CONF    EVAL    CORRECT  CLOSE ")

            self.QEK_L_7.setText("         HOSTILE  FRIEND  HOSTILE  FRIEND  UNKNOWN           CONTROL")
            self.QEK_L_8.setText("   |-------FC4------|        |--------FC5------|                    ")
            self.QEK_L_9.setText(" DESIG    BREAK   HOLD     SLAVE    BREAK    HOLD             THREAT")

            self.QEK_L_10.setText("          TRACK   FIRE              TRACK    FIRE             ASSES ")
            self.QEK_L_11.setText("    |---------LINK Y----------|                                     ")
            self.QEK_L_12.setText(" ASSIGN   DEASS   CORR     DECORR           LAUNCH   CHANGE   WIPE  ")

            self.QEK_L_13.setText("                                                    LCH SIDE        ")

        elif ambiente == "EW":
            self.QEK_L_1.setText("                                                                    ")
            self.QEK_L_2.setText("   |----INITIATE---|         |---ENVIRONMENT---|        LINK Y      ")
            self.QEK_L_3.setText("  ESM     ESM      RP       AIR     SURF    SUBSURF  ASSIGN  DEASS  ")

            self.QEK_L_4.setText("BEARING   FIX                                                       ")
            self.QEK_L_5.setText("   |----------------IDENTITY-----------------|                      ")
            self.QEK_L_6.setText("PENDING   POSS     POSS     CONF     CONF   EVAL    CORRECT   CLOSE ")

            self.QEK_L_7.setText("        HOSTILE   FRIEND   HOSTILE  FRIENF UNKNOWN           CONTROL")
            self.QEK_L_8.setText("   |-----------ECM----------|            CHAFF                      ")
            self.QEK_L_9.setText(" DESIG    BREAK   START    STOP     ASSIGN   DEASS            THREAT")

            self.QEK_L_10.setText("          TRACK   JAM      JAM                                ASSES ")
            self.QEK_L_11.setText("    |------FC2-----|         |------------FC6-----------|           ")
            self.QEK_L_12.setText(" DESIG    BREAK   HOLD     DESIG    SLAVE    BREAK    HOLD    WIPE  ")

            self.QEK_L_13.setText("          TRACK   FIRE                       TRACK    FIRE          ")

        elif ambiente == "HECO":
            self.QEK_L_1.setText("   |-----------------------INITIATE--------------------|            ")
            self.QEK_L_2.setText("   |-------AIR-------|                 |----SURFACE----|            ")
            self.QEK_L_3.setText("  AUTO     RAM      DR       RP      AUTO     RAM      DR           ")

            self.QEK_L_4.setText("                                                                    ")
            self.QEK_L_5.setText("   |-------------ASSIGN---------------|                             ")
            self.QEK_L_6.setText(" AUTO      RAM      DR      LOST     LRO      NEXT   CORRECT  CLOSE ")

            self.QEK_L_7.setText("                                            TRACK            CONTROL")
            self.QEK_L_8.setText("   |---------------------IDENTITY-----------------------|           ")
            self.QEK_L_9.setText("PENDING   POSS     POSS     CONF    CONF     EVAL     HELI     IFF  ")

            self.QEK_L_10.setText("         HOSTILE  FRIEND  HOSTILE  FRIENF  UNKNOWN           ACT DEC")
            self.QEK_L_11.setText("    |---------LINK Y----------|                                     ")
            self.QEK_L_12.setText(" ASSIGN   DEASS   CORR     DECORR          INITIATE  ASSIGN   WIPE  ")

            self.QEK_L_13.setText("                                             AUTO     AUTO          ")

        elif ambiente == "LINCO":
            self.QEK_L_1.setText("   |----------------------INITIATE---------------------|            ")
            self.QEK_L_2.setText("   |-------AIR------|                 |-----SURFACE----|            ")
            self.QEK_L_3.setText(" AUTO     RAM       DR       RP     AUTO     RAM       DR           ")

            self.QEK_L_4.setText("                                                                    ")
            self.QEK_L_5.setText("   |-------------ASSIGN---------------|                             ")
            self.QEK_L_6.setText(" AUTO     RAM      DR      LOST      LRO     NEXT   CORRECT   CLOSE ")

            self.QEK_L_7.setText("                                            TRACK            CONTROL")
            self.QEK_L_8.setText("   |---------------------IDENTITY-----------------------|           ")
            self.QEK_L_9.setText("PENDING   POSS    POSS     CONF      CONF    EVAL     HELI     IFF  ")

            self.QEK_L_10.setText("        HOSTILE  FRIEND   HOSTILE   FRIENF  UNKNOWN          ACT DEC")
            self.QEK_L_11.setText("    |------------LINK Y---------------|                             ")
            self.QEK_L_12.setText(" ASSIGN   DEASS    CORR    DECORR   GRID   INITIATE  ASSIGN   WIPE  ")

            self.QEK_L_13.setText("                                    LOOCK    AUTO     AUTO          ")

        elif ambiente == "OPS":
            self.QEK_L_1.setText("                                                                    ")
            self.QEK_L_2.setText("   |------FC3------|          |------FC5-------|                    ")
            self.QEK_L_3.setText(" DESIG   BREAK    HOLD     SLAVE   BREAK     HOLD             STOP  ")

            self.QEK_L_4.setText("         TRACK    FIRE             TRACK     FIRE           FIRE INH")
            self.QEK_L_5.setText("  |------FC4-------|         |-------FC6------|          TORPEDO    ")
            self.QEK_L_6.setText(" DESIG   BREAK    HOLD     SLAVE    BREAK    HOLD    LAUNCH   CHANGE")

            self.QEK_L_7.setText("         TRACK    FIRE              TRACK    FIRE           LCH SIDE")
            self.QEK_L_8.setText("   |-----------ECM----------|            CHAFF                      ")
            self.QEK_L_9.setText(" DESIG    BREAK   START    STOP     ASSIGN   DEASS            THREAT")

            self.QEK_L_10.setText("         TRACK    JAM     JAM                                 ASSES ")
            self.QEK_L_11.setText("  |-----------------EXOCET--------------------|                     ")
            self.QEK_L_12.setText("DESSIGN   DEASS    INIT     TERM    CHECK   CHANGE   BLIND     NEXT ")

            self.QEK_L_13.setText("                  RECOMM   RECOMM  UNW TGT LCH SIDE  ARCS      ARCS ")

        elif ambiente == "SPC":
            self.QEK_L_1.setText("   |------------INITIATE-------------|                              ")
            self.QEK_L_2.setText("   |---------SURFACE---------|       |                              ")
            self.QEK_L_3.setText("  AUTO     RAM      DR     VISUAL    RP                             ")

            self.QEK_L_4.setText("                          BEARING                                   ")
            self.QEK_L_5.setText("   |------------ASSIGN----------------|                             ")
            self.QEK_L_6.setText("  AUTO     RAM      DR      LOST     LRO     NEXT   CORRECT   CLOSE ")

            self.QEK_L_7.setText("                                            TRACK            CONTROL")
            self.QEK_L_8.setText("   |-----------------------IDENTITY--------------------|            ")
            self.QEK_L_9.setText(" PENDING   POSS    POSS     CONF      CONF    EVAL    HELI          ")

            self.QEK_L_10.setText("         HOSTILE FRIEND   HOSTILE   FRIEN   UNKNOWN                 ")
            self.QEK_L_11.setText("    |----------------LINK Y--------------------|                    ")
            self.QEK_L_12.setText(" ASSIGN   DEASS    CORR    DECORR          INITIATE  ASSIGN   WIPE  ")

            self.QEK_L_13.setText("                                             AUTO     AUTO          ")

    def cambioEtiquetaQEK_R(self,ambiente):

        if ambiente == "AAW":
            self.QEK_R_1.setText("                                                                    ")
            self.QEK_R_2.setText("   |-------FC1-------|       |-----------FC5-----------|            ")
            self.QEK_R_3.setText(" DESIG    BREAK    HOLD    DESIG    SLAVE    BREAK    HOLD     STOP ")

            self.QEK_R_4.setText("         TRACK    FIRE                      TRACK    FIRE   FIRE INH")
            self.QEK_R_5.setText("   |-------FC2------|        |-----------FC6-----------|            ")
            self.QEK_R_6.setText(" DESIG    BREAK    HOLD    DESIG    SLAVE   BREAK    HOLD           ")

            self.QEK_R_7.setText("         TRACK    FIRE                      TRACK    FIRE           ")
            self.QEK_R_8.setText("   |-----------ECM-----------|          CHAFF                       ")
            self.QEK_R_9.setText(" DESIG    BREAK   START    STOP    ASSIGN    DEASS    IFF    THREAT ")

            self.QEK_R_10.setText("          TRACK    JAM      JAM                     ACT DEC   ASSES ")
            self.QEK_R_11.setText("    |----------------EXOCET--------------------|                    ")
            self.QEK_R_12.setText(" ASSIGN   DEASS    INIT    TERM     CHECK   CHANGE   BLIND    NEXT  ")

            self.QEK_R_13.setText("                  RECOMM   RECOMM  UNW TGT LCH SIDE   ARCS    ARCS  ")

        elif ambiente == "APC":
            self.QEK_R_1.setText("   |------------INITIATE-------------|                              ")
            self.QEK_R_2.setText("   |-----------AIR-----------|                                      ")
            self.QEK_R_3.setText(" AUTO      RAM      DR     VISUAL    RP                             ")

            self.QEK_R_4.setText("                          BEARING                                   ")
            self.QEK_R_5.setText("   |------------ASSIGN----------------|                             ")
            self.QEK_R_6.setText(" AUTO     RAM       DR      LOST     LRO     NEXT    CORRECT  CLOSE ")

            self.QEK_R_7.setText("                                             TRACK           CONTROL")
            self.QEK_R_8.setText("   |-----------------------IDENTITY--------------------|            ")
            self.QEK_R_9.setText("PENDING   POSS     POSS     CONF    CONF     EVAL     HELI           ")

            self.QEK_R_10.setText("         HOSTILE FRIEND   HOSTILE   FRIEN   UNKNOWN                 ")
            self.QEK_R_11.setText("   |-----------------LINK Y--------------------|                    ")
            self.QEK_R_12.setText("ASSIGN    DEASS    CORR    DECORR          INITIATE  ASSIGN   WIPE  ")

            self.QEK_R_13.setText("                                             AUTO     AUTO          ")

        elif ambiente == "ASW":
            self.QEK_R_1.setText("   |------------------INITIATE-----------------|                    ")
            self.QEK_R_2.setText("   |---SUBSURFACE---|                 |---ESM--|         ASSIGN     ")
            self.QEK_R_3.setText("  DR     DATUM    ACOUST     RP    BEARING    FIX     LOST     LRO  ")

            self.QEK_R_4.setText("                BEARING                                             ")
            self.QEK_R_5.setText("   |-----------------IDENTITY-----------------|                     ")
            self.QEK_R_6.setText("PENDING   POSS     POSS     CONF     CONF    EVAL    CORRECT  CLOSE ")

            self.QEK_R_7.setText("         HOSTILE  FRIEND  HOSTILE  FRIEND  UNKNOWN           CONTROL")
            self.QEK_R_8.setText("   |-------FC4------|        |--------FC5------|                    ")
            self.QEK_R_9.setText(" DESIG    BREAK   HOLD     SLAVE    BREAK    HOLD             THREAT")

            self.QEK_R_10.setText("          TRACK   FIRE              TRACK    FIRE             ASSES ")
            self.QEK_R_11.setText("    |---------LINK Y----------|                                     ")
            self.QEK_R_12.setText(" ASSIGN   DEASS   CORR     DECORR           LAUNCH   CHANGE   WIPE  ")

            self.QEK_R_13.setText("                                                    LCH SIDE        ")

        elif ambiente == "EW":
            self.QEK_R_1.setText("                                                                    ")
            self.QEK_R_2.setText("   |----INITIATE---|         |---ENVIRONMENT---|        LINK Y      ")
            self.QEK_R_3.setText("  ESM     ESM      RP       AIR     SURF    SUBSURF  ASSIGN  DEASS  ")

            self.QEK_R_4.setText("BEARING   FIX                                                       ")
            self.QEK_R_5.setText("   |----------------IDENTITY-----------------|                      ")
            self.QEK_R_6.setText("PENDING   POSS     POSS     CONF     CONF   EVAL    CORRECT   CLOSE ")

            self.QEK_R_7.setText("        HOSTILE   FRIEND   HOSTILE  FRIENF UNKNOWN           CONTROL")
            self.QEK_R_8.setText("   |-----------ECM----------|            CHAFF                      ")
            self.QEK_R_9.setText(" DESIG    BREAK   START    STOP     ASSIGN   DEASS            THREAT")

            self.QEK_R_10.setText("          TRACK   JAM      JAM                                ASSES ")
            self.QEK_R_11.setText("    |------FC2-----|         |------------FC6-----------|           ")
            self.QEK_R_12.setText(" DESIG    BREAK   HOLD     DESIG    SLAVE    BREAK    HOLD    WIPE  ")

            self.QEK_R_13.setText("          TRACK   FIRE                       TRACK    FIRE          ")

        elif ambiente == "HECO":
            self.QEK_R_1.setText("   |-----------------------INITIATE--------------------|            ")
            self.QEK_R_2.setText("   |-------AIR-------|                 |----SURFACE----|            ")
            self.QEK_R_3.setText("  AUTO     RAM      DR       RP      AUTO     RAM      DR           ")

            self.QEK_R_4.setText("                                                                    ")
            self.QEK_R_5.setText("   |-------------ASSIGN---------------|                             ")
            self.QEK_R_6.setText(" AUTO      RAM      DR      LOST     LRO      NEXT   CORRECT  CLOSE ")

            self.QEK_R_7.setText("                                            TRACK            CONTROL")
            self.QEK_R_8.setText("   |---------------------IDENTITY-----------------------|           ")
            self.QEK_R_9.setText("PENDING   POSS     POSS     CONF    CONF     EVAL     HELI     IFF  ")

            self.QEK_R_10.setText("         HOSTILE  FRIEND  HOSTILE  FRIENF  UNKNOWN           ACT DEC")
            self.QEK_R_11.setText("    |---------LINK Y----------|                                     ")
            self.QEK_R_12.setText(" ASSIGN   DEASS   CORR     DECORR          INITIATE  ASSIGN   WIPE  ")

            self.QEK_R_13.setText("                                             AUTO     AUTO          ")

        elif ambiente == "LINCO":
            self.QEK_R_1.setText("   |----------------------INITIATE---------------------|            ")
            self.QEK_R_2.setText("   |-------AIR------|                 |-----SURFACE----|            ")
            self.QEK_R_3.setText(" AUTO     RAM       DR       RP     AUTO     RAM       DR           ")

            self.QEK_R_4.setText("                                                                    ")
            self.QEK_R_5.setText("   |-------------ASSIGN---------------|                             ")
            self.QEK_R_6.setText(" AUTO     RAM      DR      LOST      LRO     NEXT   CORRECT   CLOSE ")

            self.QEK_R_7.setText("                                            TRACK            CONTROL")
            self.QEK_R_8.setText("   |---------------------IDENTITY-----------------------|           ")
            self.QEK_R_9.setText("PENDING   POSS    POSS     CONF      CONF    EVAL     HELI     IFF  ")

            self.QEK_R_10.setText("        HOSTILE  FRIEND   HOSTILE   FRIENF  UNKNOWN          ACT DEC")
            self.QEK_R_11.setText("    |------------LINK Y---------------|                             ")
            self.QEK_R_12.setText(" ASSIGN   DEASS    CORR    DECORR   GRID   INITIATE  ASSIGN   WIPE  ")

            self.QEK_R_13.setText("                                    LOOCK    AUTO     AUTO          ")

        elif ambiente == "OPS":
            self.QEK_R_1.setText("                                                                    ")
            self.QEK_R_2.setText("   |------FC3------|          |------FC5-------|                    ")
            self.QEK_R_3.setText(" DESIG   BREAK    HOLD     SLAVE   BREAK     HOLD             STOP  ")

            self.QEK_R_4.setText("         TRACK    FIRE             TRACK     FIRE           FIRE INH")
            self.QEK_R_5.setText("  |------FC4-------|         |-------FC6------|          TORPEDO    ")
            self.QEK_R_6.setText(" DESIG   BREAK    HOLD     SLAVE    BREAK    HOLD    LAUNCH   CHANGE")

            self.QEK_R_7.setText("         TRACK    FIRE              TRACK    FIRE           LCH SIDE")
            self.QEK_R_8.setText("   |-----------ECM----------|            CHAFF                      ")
            self.QEK_R_9.setText(" DESIG    BREAK   START    STOP     ASSIGN   DEASS            THREAT")

            self.QEK_R_10.setText("         TRACK    JAM     JAM                                 ASSES ")
            self.QEK_R_11.setText("  |-----------------EXOCET--------------------|                     ")
            self.QEK_R_12.setText("DESSIGN   DEASS    INIT     TERM    CHECK   CHANGE   BLIND     NEXT ")

            self.QEK_R_13.setText("                  RECOMM   RECOMM  UNW TGT LCH SIDE  ARCS      ARCS ")

        elif ambiente == "SPC":
            self.QEK_R_1.setText("   |------------INITIATE-------------|                              ")
            self.QEK_R_2.setText("   |---------SURFACE---------|       |                              ")
            self.QEK_R_3.setText("  AUTO     RAM      DR     VISUAL    RP                             ")

            self.QEK_R_4.setText("                          BEARING                                   ")
            self.QEK_R_5.setText("   |------------ASSIGN----------------|                             ")
            self.QEK_R_6.setText("  AUTO     RAM      DR      LOST     LRO     NEXT   CORRECT   CLOSE ")

            self.QEK_R_7.setText("                                            TRACK            CONTROL")
            self.QEK_R_8.setText("   |-----------------------IDENTITY--------------------|            ")
            self.QEK_R_9.setText(" PENDING   POSS    POSS     CONF      CONF    EVAL    HELI          ")

            self.QEK_R_10.setText("         HOSTILE FRIEND   HOSTILE   FRIEN   UNKNOWN                 ")
            self.QEK_R_11.setText("    |----------------LINK Y--------------------|                    ")
            self.QEK_R_12.setText(" ASSIGN   DEASS    CORR    DECORR          INITIATE  ASSIGN   WIPE  ")

            self.QEK_R_13.setText("                                             AUTO     AUTO          ")
