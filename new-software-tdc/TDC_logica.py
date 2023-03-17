#from auxiliar1 import tecla_mik_L

# from _typeshed import ReadableBuffer
import sys
from PyQt5.QtWidgets import QApplication      
from TDC_GUI import TDC_GUI
from comm import SocketCom

if __name__ == '__main__':
    with open("../.config") as config_file:
        content = config_file.read()
    content = content.split("|")
    role = content[0] # Primera linea, valor del role
    port = int(content[8])

    radar_socket = SocketCom(port, ["/", '/DCL','/AND1','/AND2'])

    app = QApplication(sys.argv)
    GUI = TDC_GUI(radar_socket, role)
    GUI.show()

    app.exec_()
    radar_socket.disconnect()
    sys.exit()
