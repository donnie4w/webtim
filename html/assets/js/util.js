//
function replace(str) {
    if (!isEmpty(str)) {
        str = str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/ /g, "&nbsp;")
            .replace(/\'/g, "&#39;")
            .replace(/\"/g, "&quot;")
            .replace(/\n/g, "<br/>");
    }
    return str
}
function isEmpty(obj) {
    if (typeof obj == "undefined" || obj == null || obj == "") {
        return true;
    } else {
        return false;
    }
}

Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1,
        "d+": this.getDate(),
        "h+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S": this.getMilliseconds()
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) :
            (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

function sleep(ms) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, ms);
    })
}

function go() {
    return new Promise(function (resolve, reject) {
        resolve;
    })
}

function datetime() {
    return new Date().Format("yyyy-MM-dd hh:mm:ss")
}

function unixnanoToDatatime(v) {
    let dt = new Date(v / 1000000);
    return dt.Format("yyyy-MM-dd hh:mm:ss");
}

function usericon(name) {
    const checksum = crc32(new TextEncoder().encode(name));
    return "/img/" + checksum % 30 + ".jpg"
}

function uuid(s) {
    return crc32(new TextEncoder().encode(s));
}

function chatid(from, to) {
    let fid = crc32(new TextEncoder().encode(from));
    let tid = crc32(new TextEncoder().encode(to));
    if (fid < tid) {
        let id = fid;
        fid = tid;
        tid = id;
    }
    return fid + "_" + tid
}

const table = [];
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
        if ((c & 1) === 1) {
            c = 0xEDB88320 ^ (c >>> 1);
        } else {
            c = c >>> 1;
        }
    }
    table[i] = c;
}
function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (~crc >>> 0);
}

function httpPost(uri, data, func) {
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            if (!isEmpty(func)) {
                func(xmlHttp.responseText);
            }
        }
    }
    xmlHttp.open("POST", "/" + uri, true);
    xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    if (isEmpty(data)) {
        xmlHttp.send();
    } else {
        xmlHttp.send(data);
    }
}

function httpPostBinary(uri, data, func) {
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            if (!isEmpty(func)) {
                func(xmlHttp.responseText);
            }
        }
    }
    xmlHttp.open("POST", "/" + uri, true);
    if (isEmpty(data)) {
        xmlHttp.send();
    } else {
        xmlHttp.send(data);
    }
}

function grayImage(src) {
    try {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var imgObj = new Image();
        imgObj.src = src;
        canvas.width = imgObj.width;
        canvas.height = imgObj.height;
        ctx.drawImage(imgObj, 0, 0);
        var imgPixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (var y = 0; y < imgPixels.height; y++) {
            for (var x = 0; x < imgPixels.width; x++) {
                var i = (y * 4) * imgPixels.width + x * 4;
                var avg = (imgPixels.data[i] + imgPixels.data[i + 1] + imgPixels.data[i + 2]) / 3;
                imgPixels.data[i] = avg;
                imgPixels.data[i + 1] = avg;
                imgPixels.data[i + 2] = avg;
            }
        }
        ctx.putImageData(imgPixels, 0, 0, 0, 0, imgPixels.width, imgPixels.height);
        return canvas.toDataURL("image/jpeg", 0.1);
    } catch (err) {
        return src;
    }
}

function screenshot(video) {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")
        .drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.5);
}

function Uint8ArrayToString(ua) {
    var dataString = "";
    for (var i = 0; i < ua.length; i++) {
        dataString += String.fromCharCode(ua[i]);
    }
    return dataString
}

function StringToUint8Array(str) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array
}

function uint8ArrayToString(bs) {
    const decoder = new TextDecoder("utf-8");
    const str = decoder.decode(bs);
    return str;
}

function gzip(d) {
    return pako.gzip(d)
}

function ungzip(d) {
    return pako.ungzip(d)
}

function readfile(file, func) {
    if (!window.FileReader) {
        throw new Error("the browser does not support read local file");
    }
    let reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
        func(new Uint8Array(reader.result))
    }
    reader.onerror = () => {
        console.error(reader.error);
    }
}

function saveFile(data, filename) {
    const blob = new Blob([data]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

function mergeUint8Arrays(utb) {
    let length = 0;
    utb.forEach(item => {
        length += item.length;
    });
    let mergedArray = new Uint8Array(length);
    let offset = 0;
    utb.forEach(item => {
        mergedArray.set(item, offset);
        offset += item.length;
    });
    return mergedArray
}



function DoWhile(conditionfunc, dofunc, loopcount) {
    if (loopcount <= 0) {
        return
    }
    if (conditionfunc) {
        dofunc
    } else {
        sleep(300).then(() => DoWhile(conditionfunc, dofunc, loopcount - 1))
    }
}