// Copyright (c) 2023, donnie <donnie4w@gmail.com>
// All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
//
// github.com/donnie4w/timjs

const STAT = {
    TIMACK: 12,
    TIMPING: 13,
    TIMREGISTER: 14,
    TIMTOKEN: 15,
    TIMAUTH: 16,
    TIMOFFLINEMSG: 17,
    TIMOFFLINEMSGEND: 18,
    TIMBROADPRESENCE: 19,
    TIMLOGOUT: 20,
    TIMPULLMESSAGE: 21,
    TIMVROOM: 22,
    TIMBUSINESS: 41,
    TIMNODES: 42,
    TIMMESSAGE: 90,
    TIMPRESENCE: 91,
    TIMREVOKEMESSAGE: 92,
    TIMBURNMESSAGE: 93,
    TIMSTREAM: 94,

    GROUP_PRIVATE: 1,
    GROUP_OPEN: 2,
    GROUP_STATUS_ALIVE: 1,
    GROUP_STATUS_CANCELLED: 2,

    BUSINESS_ROSTER: 1,
    BUSINESS_USERROOM: 2,
    BUSINESS_ROOMUSERS: 3,
    BUSINESS_ADDROSTER: 4,
    BUSINESS_FRIEND: 5,
    BUSINESS_REMOVEROSTER: 6,
    BUSINESS_BLOCKROSTER: 7,
    BUSINESS_NEWROOM: 8,
    BUSINESS_ADDROOM: 9,
    BUSINESS_PASSROOM: 10,
    BUSINESS_NOPASSROOM: 11,
    BUSINESS_PULLROOM: 12,
    BUSINESS_KICKROOM: 13,
    BUSINESS_BLOCKROOM: 14,
    BUSINESS_BLOCKROOMMEMBER: 15,
    BUSINESS_LEAVEROOM: 16,
    BUSINESS_CANCELROOM: 17,
    BUSINESS_BLOCKROSTERLIST: 18,
    BUSINESS_BLOCKROOMLIST: 19,
    BUSINESS_BLOCKROOMMEMBERLIST: 20,
    BUSINESS_MODIFYAUTH: 21,

    NODEINFO_ROSTER: 1,
    NODEINFO_ROOM: 2,
    NODEINFO_ROOMMEMBER: 3,
    NODEINFO_USERINFO: 4,
    NODEINFO_ROOMINFO: 5,
    NODEINFO_MODIFYUSER: 6,
    NODEINFO_MODIFYROOM: 7,
    NODEINFO_BLOCKROSTERLIST: 8,
    NODEINFO_BLOCKROOMLIST: 9,
    NODEINFO_BLOCKROOMMEMBERLIST: 10,

    VRITURLROOM_REGISTER: 1,
    VRITURLROOM_REMOVE: 2,
    VRITURLROOM_ADDAUTH: 3,
    VRITURLROOM_RMAUTH: 4,
    VRITURLROOM_SUB: 5,
    VRITURLROOM_SUBCANCEL: 6,

    ERR_OVERENTRY: 4111,
    ERR_HASEXIST: 4101,
    ERR_NOPASS: 4102,
    ERR_EXPIREOP: 4103,
    ERR_PARAMS: 4104,
    ERR_AUTH: 4105,
    ERR_ACCOUNT: 4106,
    ERR_INTERFACE: 4107,
    ERR_CANCEL: 4108,
    ERR_NOEXIST: 4109,
    ERR_BLOCK: 4110,
    ERR_OVERENTRY: 4111,
    ERR_MODIFYAUTH: 4112,

}

class Tid {
    node = "";
    domain = null;
    resource = null;
    termtyp = null;
    constructor(node) {
        this.node = node;
    }
}

class TimAck {
    ok = null;
    timType = null;
    error = null;
    t = null;
    n = null;
}

class TimAuth {
    name = "";
    pwd = "";
    domain = null;
    resource = "";
    termtyp = 0;
    token = null;
    extend = null;
}

class TimReq {
    rtype = null;
    node = null;
    node2 = null;
    reqInt = null;
    reqInt2 = null;
    reqStr = null;
    reqStr2 = null;
}

class TimMessage {
    msType = null;
    odType = null;
    id = null;
    mid = null;
    bnType = null;
    fromTid = null;
    toTid = null;
    roomTid = null;
    dataString = null;
    dataBinary = null;
    isOffline = null;
    timestamp = null;
    udtype = null;
    udshow = null;
    extend = null;
    extra = null;
    constructor(msType, odType) {
        this.msType = msType;
        this.odType = odType;
    }
}

class TimPresence {
    id = null;
    offline = false;
    subStatus = null;
    fromTid = null;
    toTid = null;
    toList = null;
    show = null;
    status = null;
    extend = null;
    extra = null;
}

class TimStream {
    id = null;
    vNode = null;
    dtype = null;
    body = null;
    fromNode = null;
}

class TimUserBean {
    name = null;
    nickName = null;
    brithday = null;
    gender = null;
    cover = null;
    area = null;
    createtime = null;
    photoTidAlbum = null;
    extend = null;
    extra = null;
}

class TimRoomBean {
    founder = null;
    managers = null;
    cover = null;
    topic = null;
    label = null;
    gtype = null;
    createtime = null;
    extend = null;
    extra = null;
}

class TimNodes {
    ntype = null;
    nodelist = null;
    usermap = null;
    roommap = null;
    node = null;
    constructor(ntype) {
        this.ntype = ntype;
    }
}

class TimMessageList {
    id = null;
    messageList = null;
}



class Tx {
    ta = new TimAuth();
    ping() {
        return encodePk(STAT.TIMPING, null);
    }
    register(username, pwd, domain) {
        this.ta.name = username;
        this.ta.pwd = pwd;
        this.ta.domain = domain;
        return encodePk(STAT.TIMREGISTER | 0x80, jsonFmt(this.ta));
    }
    token(username, pwd, domain) {
        this.ta.name = username;
        this.ta.pwd = pwd;
        this.ta.domain = domain;
        return encodePk(STAT.TIMTOKEN, jsonFmt(this.ta));
    }
    loginByAccount(username, pwd, domain, resource, termtyp) {
        this.ta.name = username;
        this.ta.pwd = pwd;
        this.ta.domain = domain;
        this.ta.resource = resource;
        this.ta.termtyp = termtyp;
        return encodePk(STAT.TIMAUTH, jsonFmt(this.ta));
    }
    loginByToken(token, resource, termtyp) {
        this.ta.token = token;
        this.ta.resource = resource;
        this.ta.termtyp = termtyp;
        return encodePk(STAT.TIMAUTH, jsonFmt(this.ta));
    }

    login() {
        return encodePk(STAT.TIMAUTH, jsonFmt(this.ta));
    }

    _message(timtype, mstype, odtype, msg, to, roomId, udshow, udtype, msgId, extend, extra) {
        let tm = new TimMessage(mstype, odtype);
        if (!isEmpty(msg)) {
            tm.dataString = msg;
        }
        if (udshow > 0) {
            tm.udshow = udshow;
        }
        if (udtype > 0) {
            this.udtype = udtype;
        }
        if (msgId > 0) {
            this.mid = msgId;
        }
        if (!isEmpty(to)) {
            tm.toTid = new Tid(to)
        }
        if (!isEmpty(roomId)) {
            tm.roomTid = new Tid(roomId);
            if (isEmpty(to)) {
                tm.msType = 3;
            }
        }
        if (!isEmpty(extend)) {
            tm.extend = extend;
        }
        if (!isEmpty(extra)) {
            tm.extra = extra;
        }
        return encodePk(timtype, jsonFmt(tm));
    }

    message2Friend(msg, to, udshow, udtype, extend, extra) {
        return this._message(STAT.TIMMESSAGE, 2, 1, msg, to, null, udshow, udtype, 0, extend, extra)
    }
    messageByPrivacy(msg, to, roomId, udshow, udtype, extend, extra) {
        return this._message(STAT.TIMMESSAGE, 2, 1, msg, to, roomId, udshow, udtype, 0, extend, extra)
    }
    message2Room(msg, roomId, udshow, udtype, extend, extra) {
        return this._message(STAT.TIMMESSAGE, 3, 1, msg, null, roomId, udshow, udtype, 0, extend, extra)
    }
    revokeMessage(msgId, to, room, msg, udshow, udtype) {
        return this._message(STAT.TIMREVOKEMESSAGE, 2, 2, msg, to, room, udshow, udtype, msgId, null, null)
    }
    burnMessage(msgId, msg, to, udshow, udtype) {
        return this._message(STAT.TIMBURNMESSAGE, 2, 3, msg, to, null, udshow, udtype, msgId, null, null)
    }

    stream(msgbs, to, room, udShow, udType) {
        let tm = new TimMessage(2, 5)
        if (!isEmpty(msgbs)) {
            tm.dataBinary = Base64.encodeToStr(msgbs);
        }
        if (!isEmpty(to)) {
            tm.toTid = new Tid(to)
        }
        if (!isEmpty(room)) {
            tm.roomTid = new Tid(room);
            if (isEmpty(to)) {
                tm.mstype = 3;
            }
        }
        if (udShow > 0) {
            tm.udshow = udShow;
        }
        if (udType > 0) {
            tm.udtype = udType;
        }
        return encodePk(STAT.TIMMESSAGE, jsonFmt(tm));
    }

    _presence(timtype, to, show, status, toList, subStatus, extend, extra) {
        let tp = new TimPresence();
        if (!isEmpty(to)) {
            tp.toTid = new Tid(to)
        }
        if (show > 0) {
            tp.show = show;
        }
        if (!isEmpty(status)) {
            tp.status = status;
        }
        if (!isEmpty(toList)) {
            tp.toList = toList;
        }
        if (subStatus > 0) {
            tp.subStatus = subStatus
        }
        if (!isEmpty(extend)) {
            tm.extend = extend;
        }
        if (!isEmpty(extra)) {
            tm.extra = extra;
        }
        return encodePk(timtype, jsonFmt(tp));
    }

    presence(to, show, status, subStatus, extend, extra) {
        return this._presence(STAT.TIMPRESENCE, to, show, status, null, subStatus, extend, extra)
    }

    presenceList(show, status, subStatus, toList, extend, extra) {
        return this._presence(STAT.TIMPRESENCE, null, show, status, toList, subStatus, extend, extra)
    }

    broadPresence(subStatus, show, status) {
        return this._presence(STAT.TIMBROADPRESENCE, null, show, status, null, subStatus, null, null)
    }

    pullmsg(rtype, to, mid, limit) {
        let rt = new TimReq();
        rt.rtype = rtype;
        rt.node = to;
        rt.reqInt = mid;
        rt.reqInt2 = limit;
        return encodePk(STAT.TIMPULLMESSAGE, jsonFmt(rt));
    }

    offlinemsg() {
        return encodePk(STAT.TIMOFFLINEMSG, null);
    }

    addroster(node, msg) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_ADDROSTER;
        rt.node = node;
        rt.reqStr = msg;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    rmroster(node) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_REMOVEROSTER;
        rt.node = node;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    blockroster(node) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_BLOCKROSTER;
        rt.node = node;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    roster() {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_ROSTER;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    userroom() {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_USERROOM;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    roomusers(node) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_ROOMUSERS;
        rt.node = node;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    newroom(gtype, roomname) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_NEWROOM;
        rt.reqInt = gtype;
        rt.node = roomname;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    addroom(gnode, msg) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_ADDROOM;
        rt.reqStr = msg;
        rt.node = gnode;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    pullroom(rnode, unode) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_PULLROOM;
        rt.node = rnode;
        rt.node2 = unode;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    nopassroom(rnode, unode, msg) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_NOPASSROOM;
        rt.node = rnode;
        rt.node2 = unode;
        rt.reqStr = msg;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    kickroom(rnode, unode) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_KICKROOM;
        rt.node = rnode;
        rt.node2 = unode;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    leaveroom(gnode) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_LEAVEROOM;
        rt.node = gnode;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    cancelroom(gnode) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_CANCELROOM;
        rt.node = gnode;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    blockroom(gnode) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_BLOCKROOM;
        rt.node = gnode;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    blockroomMember(gnode, tonode) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_BLOCKROOMMEMBER;
        rt.node = gnode;
        rt.node2 = tonode;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    blockrosterlist() {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_BLOCKROSTERLIST;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    blockroomlist() {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_BLOCKROOMLIST;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    blockroomMemberlist(gnode) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_BLOCKROOMMEMBERLIST;
        rt.node = gnode;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    modify(oldpwd, newpwd) {
        let rt = new TimReq();
        rt.rtype = STAT.BUSINESS_MODIFYAUTH;
        rt.reqStr = oldpwd;
        rt.reqStr2 = newpwd;
        return encodePk(STAT.TIMBUSINESS, jsonFmt(rt));
    }

    virtualroom(rtype, vnode, unode) {
        let rt = new TimReq();
        rt.rtype = rtype;
        if (!isEmpty(vnode)) {
            rt.node = vnode;
        }
        if (!isEmpty(unode)) {
            rt.node2 = unode;
        }
        return encodePk(STAT.TIMVROOM, jsonFmt(rt));
    }

    pushstream(node, body, dtype) {
        let tm = new TimStream();
        tm.vNode = node;
        tm.body = body;
        if (dtype != 0) {
            tm.dtype = dtype;
        }
        return encodePk(STAT.TIMSTREAM, jsonFmt(tm));
    }

    nodeinfo(ntype, nodelist, usermap, roommap) {
        let tn = new TimNodes(ntype);
        if (!isEmpty(nodelist)) {
            tn.nodelist = nodelist;
        }
        if (!isEmpty(usermap)) {
            tn.usermap = usermap;
        }
        if (!isEmpty(roommap)) {
            tn.roommap = roommap;
        }
        return encodePk(STAT.TIMNODES, jsonFmt(tn));
    }
}

class timClient {
    messageHandler = null;
    presenceHandler = null;
    streamHandler = null;
    nodesHandler = null;
    ackHandler = null;
    pullmessageHandler = null;
    offlineMsgHandler = null;
    offlinemsgEndHandler = null;
    tx = new Tx();

    constructor(tls, ip, port) {
        this.isLogout = false;
        this.url = this.formatUrl(ip, port, tls) + "/tim";
        this.origin = "https://github.com/donnie4w/tim";
        this.websocket = null;
        this.pingNum = 1;
        this.v = 0;
    }

    connect() {
        if (!isEmpty(this.url)) {
            this.websocket = new WebSocket(this.url);
            this.isLogout = false;
            let father = this;
            this.websocket.onopen = function (evt) {
                father.pingNum = 0;
                father.v++;
                father.login();
                father.watch(father.v);
            };
            this.websocket.onclose = function (evt) {
                console.warn("onclose");
                father.close();
                father.websocket = null;
                father.v++;
                pause(2000);
                if (!father.isLogout) {
                    father.connect()
                }
            };
            this.websocket.onerror = function (evt, e) { console.warn("onerror"); };
            this.websocket.onmessage = function (evt) {
                if (evt.data instanceof Blob) {
                    var reader = new FileReader();
                    reader.readAsArrayBuffer(evt.data);
                    reader.onload = function () {
                        father.prase(this.result);
                    }
                }
            }
        }
    }

    sendws(bs) {
        this.websocket.send(bs);
    }

    sendwsWithTry(bs) {
        try {
            this.websocket.send(bs);
        } catch (err) {
            console.error(err);
        }
    }

    prase(data) {
        let type = new Uint8Array(data.slice(0, 1))[0];
        if ((type & 0x80) == 0x80) {
            this.sendws(encodeBytePk(STAT.TIMACK, new Uint8Array(data.slice(1, 5))))
            data = data.slice(5, data.byteLength);
        } else {
            data = data.slice(1, data.byteLength);
        }
        const decoderpj = new TextDecoder('utf-8');
        const jdata = decoderpj.decode(data);
        this.pingNum = 0;
        switch (type & 0x7f) {
            case STAT.TIMACK:
                if (!isEmpty(this.ackHandler)) {
                    this.ackHandler(jdata);
                }
                break;
            case STAT.TIMPING:
                if (this.pingNum > 0) {
                    this.pingNum--;
                }
                break;
            case STAT.TIMMESSAGE:
                if (!isEmpty(this.messageHandler)) {
                    this.messageHandler(jdata);
                }
                break;
            case STAT.TIMPRESENCE:
                if (!isEmpty(this.presenceHandler)) {
                    this.presenceHandler(jdata);
                }
                break;
            case STAT.TIMNODES:
                if (!isEmpty(this.nodesHandler)) {
                    this.nodesHandler(jdata);
                }
                break;
            case STAT.TIMPULLMESSAGE:
                if (!isEmpty(this.pullmessageHandler)) {
                    this.pullmessageHandler(jdata);
                }
                break;
            case STAT.TIMOFFLINEMSG:
                if (!isEmpty(this.offlineMsgHandler)) {
                    this.offlineMsgHandler(jdata);
                }
                break;
            case STAT.TIMOFFLINEMSGEND:
                if (!isEmpty(this.offlinemsgEndHandler)) {
                    this.offlinemsgEndHandler(jdata);
                }
                break;
            case STAT.TIMSTREAM:
                if (!isEmpty(this.streamHandler)) {
                    this.streamHandler(jdata);
                }
                break;
            default:
                console.error("Undefined");
        }
    }

    watch(v) {
        if (v != this.v) {
            return
        }
        if (!isEmpty(this.websocket) && this.url != "" && this.pingNum > 5 && !this.isLogout) {
            this.close();
        } else if (!isEmpty(this.websocket)) {
            try {
                this.pingNum++;
                this.ping();
                this.sleep(10000).then(() => this.watch(v));
            } catch (err) {
                console.log(err);
            }
        }
    }

    sleep(ms) {
        return new Promise(function (resolve, reject) {
            setTimeout(resolve, ms);
        })
    }


    formatUrl(ip, port, tls) {
        if (ip == "" || port > 65535 || port < 0) {
            return ""
        }
        let url = "";
        if (tls) {
            url = "wss://" + ip + ":" + port;
        } else {
            url = "ws://" + ip + ":" + port;
        }
        return url
    }

    login() {
        if (!isEmpty(this.websocket)) {
            this.sendws(this.tx.login());
        }
        return
    }

    close() {
        try {
            if (!isEmpty(this.websocket)) {
                this.websocket.close();
            }
        } catch (err) {
            console.error(err);
        }
    }

    ping() {
        this.sendws(this.tx.ping())
    }

    CloseAndLogout() {
        this.isLogout = true
        this.close()
    }

    // resource is the terminal information defined by the developer. For example, phone model: HUAWEI P50 Pro, iPhone 11 Pro
    // if resource is not required, pass ""
    // resource是开发者自定义的终端信息，一般是登录设备信息，如 HUAWEI P50 Pro，若不使用，赋空值即可
    Login(name, pwd, domain, resource, termtyp) {
        this.close()
        this.tx.loginByAccount(name, pwd, domain, resource, termtyp)
        if (isEmpty(this.websocket)) {
            this.connect()
        }
    }

    LoginByToken(token, resource, termtyp) {
        this.close()
        this.Tx.loginByToken(token, resource, termtyp)
        if (isEmpty(this.websocket)) {
            this.connect()
        }
    }

    // 退出登录
    Logout() {
        this.CloseAndLogout()
    }

    Modify(oldpwd, newpwd) {
        this.sendws(this.tx.modify(oldpwd, newpwd))
    }

    // send message to a user
    // udShow and udType is a value defined by the developer and is sent to the peer terminal as is
    // udShow 和 udType 为开发者自定义字段，会原样发送到对方的终端，由开发者自定义解析，
    // If udShow or udType  is not required, pass 0
    // udShow 或 udType  不使用时，传默认值0
    MessageToUser(user, msg, udShow, udType) {
        this.sendws(this.tx.message2Friend(msg, user, udShow, udType))
    }

    // revoke the message 撤回信息
    // mid is message's id
    // mid and to is  required
    RevokeMessage(mid, to, room, msg, udShow, udType) {
        this.sendws(this.tx.revokeMessage(mid, to, room, msg, udShow, udType))
    }

    // Burn After Reading  阅后即焚
    // mid is message's id
    // mid and to is  required
    BurnMessage(mid, to, msg, udShow, udType) {
        this.sendws(this.tx.burnMessage(mid, msg, to, udShow, udType))
    }

    // send message to a room
    MessageToRoom(room, msg, udShow, udType) {
        this.sendws(this.tx.message2Room(msg, room, udShow, udType))
    }

    // send a message to a room member
    MessageByPrivacy(user, room, msg, udShow, udType) {
        this.sendws(this.tx.messageByPrivacy(msg, user, room, udShow, udType))
    }

    // send stream data to user
    StreamToUser(to, msg, udShow, udType) {
        this.sendws(this.tx.stream(msg, to, null, udShow, udType))
    }

    // send stream data to room
    StreamToRoom(room, msg, udShow, udType) {
        this.sendws(this.tx.stream(msg, null, room, udShow, udType))
    }

    // send presence to other user
    // 发送状态给其他账号
    PresenceToUser(to, show, status, subStatus, extend, extra) {
        this.sendws(this.tx.presence(to, show, status, subStatus, extend, extra))
    }

    // send presence to other user list
    PresenceToList(toList, show, status, subStatus, extend, extra) {
        this.sendws(this.tx.presenceList(show, status, subStatus, toList, extend, extra))
    }

    // broad the presence and substatus to all the friends
    // 向所有好友广播状态和订阅状态
    BroadPresence(subStatus, show, status) {
        this.sendws(this.tx.broadPresence(subStatus, show, status))
    }

    // triggers tim to send user rosters
    // 触发tim服务器发送用户花名册
    Roster() {
        this.sendws(this.tx.roster())
    }

    // send request to  the account for add friend
    Addroster(node, msg) {
        this.sendws(this.tx.addroster(node, msg))
    }

    // remove a relationship with a specified account
    // 移除与指定账号的关系
    Rmroster(node) {
        this.sendws(this.tx.rmroster(node))
    }

    // Block specified account
    // 拉黑指定账号
    Blockroster(node) {
        this.sendws(this.tx.blockroster(node))
    }

    // pull message with user
    // 拉取用户聊天消息
    PullUserMessage(to, mid, limit) {
        this.sendws(this.tx.pullmsg(1, to, mid, limit))
    }

    // pull message of group
    // 拉取群信息
    PullRoomMessage(to, mid, limit) {
        this.sendws(this.tx.pullmsg(2, to, mid, limit))
    }

    // triggers tim to send the offlien message
    // 触发tim服务器发送离线信息
    OfflineMsg() {
        this.sendws(this.tx.offlinemsg())
    }

    // triggers tim to send the user's ROOM account
    // 触发tim服务器发送用户的群账号
    UserRoom() {
        this.sendws(this.tx.userroom())
    }

    // triggers tim to send the ROOM member account
    // 触发tim服务器发送群成员账号
    RoomUsers(node) {
        this.sendws(this.tx.roomusers(node))
    }

    // creating a room, provide the room name and room type
    // 创建群，需提供群名称和群类型
    NewRoom(gtype, roomname) {
        this.sendws(this.tx.newroom(gtype, roomname))
    }

    // send a request to join the group
    // 发送一个加入群的请求
    AddRoom(node, msg) {
        this.sendws(this.tx.addroom(node, msg))
    }

    // pull a account into the group
    // 将用户拉入群
    PullInRoom(roomNode, userNode) {
        this.sendws(this.tx.pullroom(roomNode, userNode))
    }

    // reject a account to join into the group
    // 拒绝用户加入群
    RejectRoom(roomNode, userNode, msg) {
        this.sendws(this.tx.nopassroom(roomNode, userNode, msg))
    }

    // Kick a account out of the group
    // 将用户踢出群
    KickRoom(roomNode, userNode) {
        this.sendws(this.tx.kickroom(roomNode, userNode))
    }

    // leave group
    // 退出群
    LeaveRoom(roomNode) {
        this.sendws(this.tx.leaveroom(roomNode))
    }

    // Cancel a group
    // 注销群
    CancelRoom(roomNode) {
        this.sendws(this.tx.cancelroom(roomNode))
    }

    // block the group
    // 拉黑群
    BlockRoom(roomNode) {
        this.sendws(this.tx.blockroom(roomNode))
    }

    // block the group member or the account join into group
    // 拉黑群成员或其他账号入群
    BlockRoomMember(roomNode, toNode) {
        this.sendws(this.tx.blockroomMember(roomNode, toNode))
    }

    // blocklist of user
    // 用户黑名单
    BlockRosterList() {
        this.sendws(this.tx.blockrosterlist())
    }

    // blocklist of user group
    // 用户群黑名单
    BlockRoomList() {
        this.sendws(this.tx.blockroomlist())
    }

    // blocklist of group
    // 群黑名单
    BlockRoomMemberlist(node) {
        this.sendws(this.tx.blockroomMemberlist(node))
    }

    // creating a Virtual room
    // 创建虚拟房间
    VirtualroomRegister() {
        this.sendws(this.tx.virtualroom(1, "", ""))
    }

    // creating a Virtual room
    // 销毁虚拟房间
    VirtualroomRemove(roomNode) {
        this.sendws(this.tx.virtualroom(2, roomNode, ""))
    }

    // Add push stream data permissions for virtual rooms to a account
    // 给账户添加向虚拟房间推送流数据的权限
    VirtualroomAddAuth(roomNode, tonode) {
        this.sendws(this.tx.virtualroom(3, roomNode, tonode))
    }

    // delete the push stream data permissions for virtual rooms to a account
    // 删除用户向虚拟房间推送流数据的权限
    VirtualroomDelAuth(roomNode, tonode) {
        this.sendws(this.tx.virtualroom(4, roomNode, tonode))
    }

    // Subscribe the stream data of the virtual room
    // 向虚拟房间订阅流数据
    VirtualroomSub(roomNode) {
        this.sendws(this.tx.virtualroom(5, roomNode, ""))
    }

    // cancel subscribe the stream data of the virtual room
    // 取消订阅虚拟房间数据
    VirtualroomSubCancel(roomNode) {
        this.sendws(this.tx.virtualroom(6, roomNode, ""))
    }

    // push the stream data to the virtual room
    // body: body is stream data
    // dtype : dtype is a data type defined by the developer and can be set to 0 if it is not required
    // 推送流数据到虚拟房间
    // body ：body是流数据
    // dtype：dtype 是开发者自定义的数据类型，若不需要，可以设置为0
    PushStream(virtualroom, body, dtype) {
        this.sendws(this.tx.pushstream(virtualroom, body, dtype))
    }

    // get user information
    // 获取用户资料
    UserInfo(nodes) {
        this.sendws(this.tx.nodeinfo(STAT.NODEINFO_USERINFO, nodes, null, null))
    }

    // get group information
    // 获取群资料
    RoomInfo(nodes) {
        this.sendws(this.tx.nodeinfo(STAT.NODEINFO_ROOMINFO, nodes, null, null))
    }

    // modify user information
    // 修改用户资料
    ModifyUserInfo(tu) {
        this.sendws(this.tx.nodeinfo(STAT.NODEINFO_MODIFYUSER, null, { "": tu }, null))
    }

    // modify group information
    // 修改群资料
    ModifyRoomInfo(roomNode, tr) {
        this.sendws(this.tx.nodeinfo(STAT.NODEINFO_MODIFYUSER, null, null, { roomNode: tr }))
    }

}

function pause(milliseconds) {
    var dt = new Date();
    let i = 0;
    while ((new Date()) - dt <= milliseconds) { i++ }
}

function encodePk(type, bs) {
    let pk = null;
    if (!isEmpty(bs)) {
        pk = utf8Encode(bs)
    }
    return encodeBytePk(type, pk)
}

function encodeBytePk(type, bs) {
    const table = [];
    let ts = new Uint8Array([type | 0x80]);
    table[0] = ts[0];
    if (!isEmpty(bs)) {
        for (let i = 0; i < bs.length; i++) {
            table[1 + i] = bs[i]
        }
    }
    let arrayBuffer = new ArrayBuffer(table.length);
    var arraybs = new Uint8Array(arrayBuffer);
    for (let i = 0; i < table.length; i++) {
        arraybs[i] = table[i];
    }
    return arraybs;
}

function isEmpty(obj) {
    if (typeof obj == "undefined" || obj == null || obj == "") {
        return true;
    } else {
        return false;
    }
}

function utf8Encode(str) {
    const codePoints = Array.from(str, c => c.codePointAt(0));
    const buffer = new ArrayBuffer(codePoints.length * 4);
    const uint8Array = new Uint8Array(buffer);
    let offset = 0;
    for (let i = 0; i < codePoints.length; i++) {
        const codePoint = codePoints[i];
        if (codePoint < 0x80) {
            uint8Array[offset++] = codePoint;
        } else if (codePoint < 0x800) {
            uint8Array[offset++] = 0xC0 | (codePoint >> 6);
            uint8Array[offset++] = 0x80 | (codePoint & 0x3F);
        } else if (codePoint < 0x10000) {
            uint8Array[offset++] = 0xE0 | (codePoint >> 12);
            uint8Array[offset++] = 0x80 | ((codePoint >> 6) & 0x3F);
            uint8Array[offset++] = 0x80 | (codePoint & 0x3F);
        } else {
            uint8Array[offset++] = 0xF0 | (codePoint >> 18);
            uint8Array[offset++] = 0x80 | ((codePoint >> 12) & 0x3F);
            uint8Array[offset++] = 0x80 | ((codePoint >> 6) & 0x3F);
            uint8Array[offset++] = 0x80 | (codePoint & 0x3F);
        }
    }
    return uint8Array.subarray(0, offset);
}

const jsonFmt = (o) => {
    return JSON.stringify(o)
}

const jsonParse = (s) => {
    return JSON.parse(s)
}

function uint8ArrayToString(bs) {
    const decoder = new TextDecoder("utf-8");
    const str = decoder.decode(bs);
    return str;
}

const Base64 = {
    keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

    //string to base64 string
    encodeToStr(input) {
        let output = '';
        let chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        let i = 0;
        input = uint8ArrayToString(utf8Encode(input));
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = output +
                Base64.keyStr.charAt(enc1) + Base64.keyStr.charAt(enc2) +
                Base64.keyStr.charAt(enc3) + Base64.keyStr.charAt(enc4);
        }
        return output;
    },

    // base64 string to string
    decode(input) {
        let output = '';
        let chr1, chr2, chr3;
        let enc1, enc2, enc3, enc4;
        let i = 0;
        input = input.replace(/[^A-Za-z0-9+/=]/g, '');
        while (i < input.length) {
            enc1 = Base64.keyStr.indexOf(input.charAt(i++));
            enc2 = Base64.keyStr.indexOf(input.charAt(i++));
            enc3 = Base64.keyStr.indexOf(input.charAt(i++));
            enc4 = Base64.keyStr.indexOf(input.charAt(i++));
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            output = output + String.fromCharCode(chr1);
            if (enc3 !== 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 !== 64) {
                output = output + String.fromCharCode(chr3);
            }
        }
        return output;
    },

    decodeToString(input) {
        let output = this.decode(input);
        return utf8Decode(output);
    },

    decodeToByteArray(input) {
        let text = this.decode(input);
        const bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
            bytes[i] = text.charCodeAt(i);
        }
        return bytes;
    }

};

function utf8Decode(inputStr) {
    var outputStr = "";
    var code1, code2, code3, code4;
    for (var i = 0; i < inputStr.length; i++) {
        code1 = inputStr.charCodeAt(i);
        if (code1 < 128) {
            outputStr += String.fromCharCode(code1);
        }
        else if (code1 < 224) {
            code2 = inputStr.charCodeAt(++i);
            outputStr += String.fromCharCode(((code1 & 31) << 6) | (code2 & 63));
        }
        else if (code1 < 240) {
            code2 = inputStr.charCodeAt(++i);
            code3 = inputStr.charCodeAt(++i);
            outputStr += String.fromCharCode(((code1 & 15) << 12) | ((code2 & 63) << 6) | (code3 & 63));
        }
        else {
            code2 = inputStr.charCodeAt(++i);
            code3 = inputStr.charCodeAt(++i);
            code4 = inputStr.charCodeAt(++i);
            outputStr += String.fromCharCode(((code1 & 7) << 18) | ((code2 & 63) << 12) | ((code3 & 63) << 6) | (code4 & 63));
        }
    }
    return outputStr;
}