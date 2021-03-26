//% weight=10 color=#008B00 icon="\uf2db" block="mbitlink"
namespace lib_mbitlink {

type reciver = (str : string) => boolean
type reseter = () => void

let _received = ""
let _recivers : reciver[] = []
let _reseters : reseter[] = []

export function reciver(reciver : reciver) {
    _recivers[_recivers.length] = reciver
}
export function reseter(reseter : reseter) {
    _reseters[_reseters.length] = reseter
}

export function hex_int16(s: string) : number {
    let v = 0
    while(s.length > 0) {
        v *= 16
        let c = s.charAt(0)
        s = s.substr(1)
        v += "0123456789ABCDEFGHIJKLMNOPQRSTUV".indexOf(c)
    } 
    return v
}   

export function int16_hex(v: number) : string {
    let c = "0123456789ABCDEF"
    if (v < 0) {
        v = 0 - v
        v--
        c = "FEDCBA9876543210"
    }
    let s = c.charAt(v % 16)
    v = Math.floor(v / 16)
    s = c.charAt(v % 16) + s
    v = Math.floor(v / 16)
    s = c.charAt(v % 16) + s
    v = Math.floor(v / 16)
    s = c.charAt(v % 16) + s
    return s
}

let request = {
    Connect : 1,
    sleep: 0
}

function setupAudio() {
    pins.digitalWritePin(DigitalPin.P0, 0)
    //pins.analogSetPitchPin(AnalogPin.P0)
    pins.setAudioPin(AnalogPin.P0)
    pins.analogWritePin(AnalogPin.P0, 0)
}

bluetooth.onBluetoothConnected(function () {
    _received = "RB"
})
bluetooth.onBluetoothDisconnected(function () {
    _received = "RI"
})
bluetooth.onUartDataReceived(
    serial.delimiters(Delimiters.NewLine), function () {
        let str = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
        received(str)
    })

function received(str : string) {
    if (_received.length > 0) _received += ","
    _received += str
}

/**
 * Start micro:bit link service
 */
//% blockId=mbitlink_start block="Start mbitlink |%sleep "
//% sleep.defl=50 sleep.min=0 sleep.max=1000
//% weight=95
export function start(sleep : number = 50) {
    request.sleep = sleep
    bluetooth.startUartService()
    reset()
    basic.forever(function () {
        if (_received.length > 0) {
            let data = _received
            _received = ""
            let str = null    
            while (data.length > 0) {
                let i = data.indexOf(",")
                if (i > 0) {
                    str = data.substr(0, i)
                    data = data.substr(i + 1)
                } else {
                    str = data    
                    data = ""
                }
                if(parse(str)) {
                    continue
                }
                for(i=0; i<_recivers.length; i++) {
                    if(_recivers[i](str)) break
                }
            }
        }
        if(request.sleep > 0)
            basic.pause(request.sleep)
    })
}

function reset() {
    if(request.Connect > 0) {
        request.Connect = 0
        basic.showLeds(`. . . . #
                        . . . # .
                        # . # . .
                        . # . . .
                        . . . . .`)
        music.playTone(131, music.beat(BeatFraction.Sixteenth))
        for(let i=0; i<_reseters.length; i++) {
            _reseters[i]()
        }
    }
}

function parse(str : string) : boolean {
    let c = str.charAt(0)
    str = str.substr(1)
    if (c == "=") {
        bluetooth.uartWriteString(str)
        return true
    }
    if (c == "R") {
        c = str.charAt(0)
        if(c == "B") {
            bluetooth.uartWriteString(str)
            return true
        }
        if(c == "I") {
            reset()
            return true
        }
        if(c == "V") {
            bluetooth.uartWriteString("DV2")
            return true
        }
    }
    return false
}

}
