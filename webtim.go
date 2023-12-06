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

	"github.com/donnie4w/gofer/httputil"
	"github.com/donnie4w/gofer/util"
	"github.com/donnie4w/simplelog/logging"
	. "github.com/donnie4w/tim/stub"
	"github.com/donnie4w/tlnet"
	"github.com/donnie4w/tlorm-go/orm"
)

func init() {
	parseconf()
	if err := orm.RegisterDefaultResource(conf.TldbTls, conf.TldbAddr, conf.TldbAuth); err == nil {
		orm.Create[webtimuser]()
		orm.Create[webtimroom]()
	} else {
		panic("init tldb failed:" + err.Error())
	}
}

func Start(addr string) {
	tlnet := tlnet.NewTlnet()
	tlnet.HandleStaticWithFilter("/", "./html", notFoundFilter(), nil)
	tlnet.POST("/register", register)
	tlnet.POST("/friendlist", friendlist)
	tlnet.POST("/newroom", newgroup)
	tlnet.POST("/roomlist", roomlist)
	logging.Info("webtim start[", addr, "]")
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
	var timadminauth = map[string]string{"username": conf.TimadminUsername, "password": conf.TimadminPassword}
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

func newgroup(hc *tlnet.HttpContext) {
	var timadminauth = map[string]string{"username": conf.TimadminUsername, "password": conf.TimadminPassword}
	node, topic, _gtype, icon := hc.PostParamTrimSpace("node"), hc.PostParamTrimSpace("topic"), hc.PostParamTrimSpace("gtype"), hc.PostParamTrimSpace("logo")
	gtype := int8(2)
	logging.Debug("newgroup>>>>", node, ",", topic, ",", gtype, ",", icon)
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
	hc.ResponseString("")
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
	Start(fmt.Sprint(":", conf.Listen))
}

func htmlTplByPath(path string, data any, hc *tlnet.HttpContext) {
	if tp, err := htmlTpl.ParseFiles(path); err == nil {
		tp.Execute(hc.Writer(), data)
	} else {
		logging.Error(err)
	}
}

var conf *confBean

type confBean struct {
	TimRegisterUrl       string `json:"timRegisterUrl"`
	TimModifyUserInfoUrl string `json:"timModifyUserInfoUrl"`
	TimNewRoom           string `json:"timNewRoom"`
	TimNewRoomInfo       string `json:"timModifyRoomInfo"`
	TldbAddr             string `json:"tldbAddr"`
	TldbAuth             string `json:"tldbAuth"`
	TldbTls              bool   `json:"tldbTls"`
	TimadminUsername     string `json:"timadminUsername"`
	TimadminPassword     string `json:"timadminPassword"`
	Listen               int    `json:"listen"`
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
