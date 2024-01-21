// Copyright (c) 2023, donnie <donnie4w@gmail.com>
// All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
//
// github.com/donnie4w/webtim

package main

import (
	"fmt"
	htmlTpl "html/template"
	"time"

	. "github.com/donnie4w/gofer/hashmap"
	"github.com/donnie4w/gofer/httputil"
	"github.com/donnie4w/gofer/util"
	"github.com/donnie4w/simplelog/logging"
	. "github.com/donnie4w/tim/stub"
	"github.com/donnie4w/tlnet"
	"github.com/donnie4w/tlorm-go/orm"
)

var timadminauth map[string]string

func init() {
	parseconf()
	timadminauth = map[string]string{"username": conf.TimadminUsername, "password": conf.TimadminPassword}
	if err := orm.RegisterDefaultResource(conf.TldbTls, conf.TldbAddr, conf.TldbAuth); err == nil {
		orm.Create[webtimuser]()
		orm.Create[webtimroom]()
	} else {
		panic("init tldb failed:" + err.Error())
	}
}

func AdminStart(addr string) {
	tlnet := tlnet.NewTlnet()
	tlnet.POST("/loginstat", loginstat)
	logging.Info("webtim AdminStart[", addr, "]")
	if err := tlnet.HttpStart(addr); err != nil {
		logging.Error("webtim start failed:", err)
	}
}

func Start(addr string) {
	tlnet := tlnet.NewTlnet()
	tlnet.HandleStaticWithFilter("/", "./html", notFoundFilter(), nil)
	tlnet.POST("/register", register)
	tlnet.POST("/token", token)

	tlnet.POST("/vroom", vroom)
	tlnet.POST("/livelist", livelist)
	tlnet.POST("/friendlist", friendlist)
	tlnet.POST("/modifyuserinfo", modifyuserinfo)
	tlnet.POST("/newroom", newgroup)
	tlnet.POST("/roomlist", roomlist)
	logging.Info("webtim start[", addr, "]")
	// if err := tlnet.HttpStartTlsBytes(addr, []byte(keystore.ServerCrt), []byte(keystore.ServerKey)); err != nil {
	// 	logging.Error("webtim start failed:", err)
	// }
	if err := tlnet.HttpStart(addr); err != nil {
		logging.Error("webtim start failed:", err)
	}
}

func notFoundFilter() *tlnet.Filter {
	f := tlnet.NewFilter()
	f.AddPageNotFoundIntercept(func(hc *tlnet.HttpContext) bool {
		hc.Redirect("/")
		return true
	})
	return f
}

type userBean struct {
	Node     string       `json:"node"`
	UserBean *TimUserBean `json:"userbean"`
}

type roomBean struct {
	Unode    string       `json:"unode"`
	Gnode    string       `json:"gnode"`
	RoomBean *TimRoomBean `json:"roombean"`
}

type webtimroom struct {
	Id      int64
	Account string `idx:"1"`
	Found   string
	Gtype   int8
	Topic   string
	Cover   string
}

type webtimuser struct {
	Id       int64
	Account  string `idx:"1"`
	Nickname string
	Cover    string
}

func register(hc *tlnet.HttpContext) {
	loginname, password, nick, icon := hc.PostParamTrimSpace("loginname"), hc.PostParamTrimSpace("password"), hc.PostParamTrimSpace("nick"), hc.PostParamTrimSpace("logo")
	logging.Debug(loginname, ",", password, ",", nick, ",", icon)
	var errstring = ""
	if loginname != "" && password != "" && icon != "" && nick != "" {
		data := `{"username": "` + loginname + `", "password": "` + password + `", "domain": "tlnet.top"}`
		//调用tim后台注册接口
		if _r, err := httputil.HttpPostParam([]byte(data), true, conf.TimRegisterUrl, timadminauth, nil); err == nil {
			if ta, _ := util.JsonDecode[*TimAck](_r); ta != nil {
				if ta.Ok {
					//调用tim后台修改用户信息接口
					httputil.HttpPostParam(util.JsonEncode(&userBean{Node: *ta.N, UserBean: &TimUserBean{Name: &nick, Cover: &icon}}), true, conf.TimModifyUserInfoUrl, timadminauth, nil)
					orm.Insert(&webtimuser{Account: *ta.N, Nickname: nick, Cover: icon})
					hc.ResponseString(`{"ok":true}`)
					return
				} else {
					if *ta.Error.Code == 4101 {
						errstring = "The account has been registered"
					} else {
						errstring = *ta.Error.Info
					}
				}
			}
		} else {
			errstring = err.Error()
		}
	} else {
		errstring = "parameter error"
	}
	hc.ResponseString(`{"ok":false,"error":"` + errstring + `"}`)
}

func loginstat(hc *tlnet.HttpContext) {
	type tk struct {
		Node   string `json:"node"`
		Active bool   `json:"active"`
	}
	bs := hc.RequestBody()
	if t, err := util.JsonDecode[tk](bs); err == nil {
		logging.Debug(t)
		if !t.Active {
			if n, ok := sessionUserMap.Get(t.Node); ok {
				liveMap.Del(t.Node)
				sessionMap.Del(n)
				sessionUserMap.Del(t.Node)
			}
		}
	}
}

func vroom(hc *tlnet.HttpContext) {
	type tk struct {
		Node  string `json:"node"`
		Rtype int8   `json:"rtype"`
	}
	token := hc.PostParamTrimSpace("token")
	topic := hc.PostParamTrimSpace("topic")
	ltype := hc.PostParamTrimSpace("ltype")
	opera := hc.PostParamTrimSpace("opera")
	livetype := 1
	if ltype == "2" {
		livetype = 2
	}
	logging.Debug(token, ",", topic, ",", ltype, ",", opera)
	if opera == "1" && topic != "" {
		cover := hc.PostParam("cover")
		logging.Debug(len(cover))
		if ub, ok := sessionMap.Get(token); ok {
			if _r, err := httputil.HttpPostParam(util.JsonEncode(&tk{ub.node, 1}), true, conf.TimVroom, timadminauth, nil); err == nil {
				ta, _ := util.JsonDecode[*TimAck](_r)
				if ta != nil {
					if ta.Ok {
						if w, _ := orm.SelectByIdx[webtimuser]("Account", ub.node); w != nil {
							liveMap.Put(ub.node, &liveVideo{Topic: topic, Node: ub.node, Vnode: *ta.N, Cover: cover, Nick: w.Nickname, LiveType: livetype})
							hc.ResponseString(string(util.JsonEncode(ta)))
							return
						}
					}
				}
			}
		}
	} else if opera == "2" {
		if ub, ok := sessionMap.Get(token); ok {
			liveMap.Del(ub.node)
		}
		hc.ResponseString("1")
		return
	} else if opera == "3" {
		node := hc.PostParamTrimSpace("node")
		vnode := hc.PostParamTrimSpace("vnode")
		if lm, ok := liveMap.Get(node); ok {
			if lm.Vnode == vnode {
				hc.ResponseString("1")
				return
			}
		}
	}
	hc.ResponseString("0")
}

func livelist(hc *tlnet.HttpContext) {
	list := make([]*liveVideo, 0)
	liveMap.Range(func(_ string, v *liveVideo) bool {
		list = append(list, v)
		return true
	})
	logging.Debug("livelist>>>>", len(list))
	hc.ResponseString(string(util.JsonEncode(list)))
}

var liveMap = NewMap[string, *liveVideo]()
var sessionUserMap = NewMap[string, string]()
var sessionMap = NewMap[string, *UserBean]()

func token(hc *tlnet.HttpContext) {
	username, password := hc.PostParamTrimSpace("username"), hc.PostParamTrimSpace("password")
	var errstring = ""
	if username != "" && password != "" {
		data := `{"name": "` + username + `", "password": "` + password + `", "domain": "tlnet.top"}`
		//调用tim后台获得登录token
		if _r, err := httputil.HttpPostParam([]byte(data), true, conf.TimToken, timadminauth, nil); err == nil {
			if ta, _ := util.JsonDecode[*TimAck](_r); ta != nil {
				if ta.Ok {
					tk := fmt.Sprint(*ta.T)
					sessionUserMap.Put(*ta.N, tk)
					sessionMap.Put(tk, newUserBean(*ta.N))
					hc.ResponseString(`{"ok":true,"token":` + tk + `}`)
					return
				} else {
					errstring = *ta.Error.Info
				}
			}
		} else {
			errstring = err.Error()
		}
	} else {
		errstring = "parameter error"
	}
	hc.ResponseString(`{"ok":false,"error":"` + errstring + `"}`)
}

func newgroup(hc *tlnet.HttpContext) {
	token, topic, _gtype, icon := hc.PostParamTrimSpace("token"), hc.PostParamTrimSpace("topic"), hc.PostParamTrimSpace("gtype"), hc.PostParamTrimSpace("logo")
	gtype := int8(2)
	var node = ""
	logging.Debug("newgroup>>>>", token, ",", topic, ",", gtype, ",", icon)
	if u, ok := sessionMap.Get(token); ok {
		node = u.node
	} else {
		hc.ResponseString("1")
		return
	}
	if node != "" && icon != "" && topic != "" {
		if _gtype == "1" {
			gtype = 1
		}
		data := `{"node": "` + node + `", "topic": "` + topic + `", "domain": "tlnet.top","gtype":` + fmt.Sprint(gtype) + `}`
		//调用tim后台建群接口
		if _r, err := httputil.HttpPostParam([]byte(data), true, conf.TimNewRoom, timadminauth, nil); err == nil {
			if ta, _ := util.JsonDecode[*TimAck](_r); ta != nil {
				if ta.Ok {
					//调用tim后台修改群资料接口
					httputil.HttpPostParam(util.JsonEncode(&roomBean{Unode: node, Gnode: *ta.N, RoomBean: &TimRoomBean{Cover: &icon}}), true, conf.TimNewRoomInfo, timadminauth, nil)
					orm.Insert(&webtimroom{Account: *ta.N, Gtype: gtype, Cover: icon, Found: node, Topic: topic})
					hc.ResponseString(`{"Cover":"` + icon + `","Topic":"` + topic + `","Node":"` + *ta.N + `"}`)
					return
				}
			}
		}
	}
	hc.ResponseString("0")
}

func modifyuserinfo(hc *tlnet.HttpContext) {
	token, nick, icon := hc.PostParamTrimSpace("token"), hc.PostParamTrimSpace("nick"), hc.PostParamTrimSpace("logo")
	var node = ""
	if u, ok := sessionMap.Get(token); ok {
		node = u.node
		httputil.HttpPostParam(util.JsonEncode(&userBean{Node: node, UserBean: &TimUserBean{Name: &nick, Cover: &icon}}), true, conf.TimModifyUserInfoUrl, timadminauth, nil)
		if w, _ := orm.SelectByIdx[webtimuser]("Account", node); w != nil {
			w.Cover = icon
			w.Nickname = nick
			orm.UpdateNonzero(w)
		}
		hc.ResponseString(`{"ok":true}`)
		return
	}
	hc.ResponseString(`{"ok":false"}`)
}

func friendlist(hc *tlnet.HttpContext) {
	if as, _ := orm.SelectsByIdLimit[webtimuser](0, 1<<15); as != nil {
		hc.ResponseString(string(util.JsonEncode(as)))
	}
}

func roomlist(hc *tlnet.HttpContext) {
	if as, _ := orm.SelectsByIdLimit[webtimroom](0, 1<<15); as != nil {
		hc.ResponseString(string(util.JsonEncode(as)))
	}
}

func main() {
	go AdminStart(conf.NotifyListen)
	Start(fmt.Sprint(":", conf.Listen))
}

func htmlTplByPath(path string, data any, hc *tlnet.HttpContext) {
	if tp, err := htmlTpl.ParseFiles(path); err == nil {
		tp.Execute(hc.Writer(), data)
	} else {
		logging.Error(err)
	}
}

type liveVideo struct {
	Topic    string
	Node     string
	Vnode    string
	Nick     string
	Cover    string
	LiveType int
}

type UserBean struct {
	node      string
	timestamp int64
}

func newUserBean(node string) *UserBean {
	u := &UserBean{node: node, timestamp: time.Now().Unix()}
	return u
}

var conf *confBean

type confBean struct {
	TimRegisterUrl       string `json:"timRegisterUrl"`
	TimModifyUserInfoUrl string `json:"timModifyUserInfoUrl"`
	TimNewRoom           string `json:"timNewRoom"`
	TimNewRoomInfo       string `json:"timModifyRoomInfo"`
	TimToken             string `json:"timToken"`
	TimVroom             string `json:"timVroom"`

	TldbAddr         string `json:"tldbAddr"`
	TldbAuth         string `json:"tldbAuth"`
	TldbTls          bool   `json:"tldbTls"`
	TimadminUsername string `json:"timadminUsername"`
	TimadminPassword string `json:"timadminPassword"`
	Listen           int    `json:"listen"`
	NotifyListen     string `json:"notifyListen"`
}

func parseconf() (err error) {
	var bs []byte
	if bs, err = util.ReadFile("webtim.json"); err == nil {
		conf, err = util.JsonDecode[*confBean](bs)
	}
	if err != nil {
		panic("webtim conf init error")
	}
	return
}
