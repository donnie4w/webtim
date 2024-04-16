// Copyright (c) 2023, donnie <donnie4w@gmail.com>
// All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
//
// github.com/donnie4w/webtim

package main

import (
	"bytes"
	"crypto/tls"
	"flag"
	"fmt"
	htmlTpl "html/template"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sort"
	"strings"
	"time"

	. "github.com/donnie4w/gofer/hashmap"
	gohttputil "github.com/donnie4w/gofer/httputil"
	"github.com/donnie4w/gofer/image"
	"github.com/donnie4w/gofer/util"
	"github.com/donnie4w/simplelog/logging"
	"github.com/donnie4w/timgo/stub"
	"github.com/donnie4w/tlnet"
	"github.com/donnie4w/tlorm-go/orm"
	"github.com/donnie4w/wfs-goclient/client"
	wfstub "github.com/donnie4w/wfs-goclient/stub"
)

var timadminauth map[string]string

func init() {
	var c = "webtim.json"
	flag.StringVar(&c, "c", "webtim.json", "config file")
	flag.Parse()
	parseconf(c)
	timadminauth = map[string]string{"username": conf.TimadminUsername, "password": conf.TimadminPassword}
	if err := orm.RegisterDefaultResource(conf.TldbTls, conf.TldbAddr, conf.TldbAuth); err == nil {
		orm.Create[webtimuser]()
		orm.Create[webtimroom]()
		orm.Create[webtimliveroom]()
	} else {
		panic("init tldb failed:" + err.Error())
	}
	if initwfs() != nil {
		panic("init wfs failed")
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
	tlnet.POST("/vregister", vregister)
	tlnet.POST("/livelist", livelist)
	tlnet.POST("/userslist", userslist)
	tlnet.POST("/modifyuserinfo", modifyuserinfo)
	tlnet.POST("/upcover", upcover)
	tlnet.POST("/newroom", newgroup)
	tlnet.POST("/roomlist", roomlist)

	tlnet.Handle("/img/", wfsAccessFunc)
	tlnet.Handle("/static/", wfsAccessFunc)
	tlnet.Handle("/webtim/", wfsAccessFunc)

	logging.Info("webtim start [", addr, "]")
	if err := tlnet.HttpStart(addr); err != nil {
		logging.Error("webtim start failed:", err)
	}
}

func wfsAccessFunc(hc *tlnet.HttpContext) {
	target, err := url.Parse(conf.WfsAccessUrl)
	if err != nil {
		return
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	if target.Scheme == "https" {
		proxy.Transport = &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	}
	proxy.Director = func(req *http.Request) {
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		if i := strings.Index(hc.Request().RequestURI, "?"); i > 0 {
			req.URL.Path = hc.Request().RequestURI[:i]
		} else {
			req.URL.Path = hc.Request().RequestURI
		}
		if decoded, err := url.QueryUnescape(req.URL.Path); err == nil {
			req.URL.Path = decoded
		}
		req.URL.RawQuery = hc.Request().URL.RawQuery
	}
	proxy.ServeHTTP(hc.Writer(), hc.Request())
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
	Node     string            `json:"node"`
	UserBean *stub.TimUserBean `json:"userbean"`
}

type roomBean struct {
	Unode    string            `json:"unode"`
	Gnode    string            `json:"gnode"`
	RoomBean *stub.TimRoomBean `json:"roombean"`
}

type webtimroom struct {
	Id      int64
	Account string `idx:"1"`
	Found   string
	Gtype   int8
	Topic   string
	Cover   string
}

type webtimliveroom struct {
	Id      int64
	Account string `idx:"1"`
	Found   string `idx:"1"`
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

type user struct {
	Id       int64
	Account  string
	Nickname string
	Cover    string
	Active   int8
}

func register(hc *tlnet.HttpContext) {
	loginname, password, nick, icon := hc.PostParamTrimSpace("loginname"), hc.PostParamTrimSpace("password"), hc.PostParamTrimSpace("nick"), hc.PostParamTrimSpace("logo")
	var errstring = ""
	if loginname != "" && password != "" && icon != "" && nick != "" {
		data := `{"username": "` + loginname + `", "password": "` + password + `", "domain": "tlnet.top"}`
		//调用tim后台注册接口
		if _r, err := gohttputil.HttpPostParam([]byte(data), true, conf.TimRegisterUrl, timadminauth, nil); err == nil {
			if ta, _ := util.JsonDecode[*stub.TimAck](_r); ta != nil {
				if ta.Ok {
					//调用tim后台修改用户信息接口
					gohttputil.HttpPostParam(util.JsonEncode(&userBean{Node: *ta.N, UserBean: &stub.TimUserBean{Name: &nick, Cover: &icon}}), true, conf.TimModifyUserInfoUrl, timadminauth, nil)
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
		if !t.Active {
			activeMap.Del(t.Node)
			if n, ok := sessionUserMap.Get(t.Node); ok {
				liveMap.Del(t.Node)
				sessionMap.Del(n)
				sessionUserMap.Del(t.Node)
			}
		} else {
			activeMap.Put(t.Node, 1)
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
	if opera == "1" && topic != "" {
		cover := hc.PostParam("cover")
		if ub, ok := sessionMap.Get(token); ok {
			if _r, err := gohttputil.HttpPostParam(util.JsonEncode(&tk{ub.node, 1}), true, conf.TimVroomUrl, timadminauth, nil); err == nil {
				ta, _ := util.JsonDecode[*stub.TimAck](_r)
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

func vregister(hc *tlnet.HttpContext) {
	type tk struct {
		Node  string `json:"node"`
		Rtype int8   `json:"rtype"`
	}
	token := hc.PostParamTrimSpace("token")
	if ub, ok := sessionMap.Get(token); ok {
		if _r, err := gohttputil.HttpPostParam(util.JsonEncode(&tk{ub.node, 1}), true, conf.TimVroomUrl, timadminauth, nil); err == nil {
			ta, _ := util.JsonDecode[*stub.TimAck](_r)
			if ta != nil {
				if ta.Ok {
					hc.ResponseString(string(util.JsonEncode(ta)))
					return
				}
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
	hc.ResponseString(string(util.JsonEncode(list)))
}

var activeMap = NewMap[string, int8]()
var liveMap = NewMap[string, *liveVideo]()
var sessionUserMap = NewMap[string, string]()
var sessionMap = NewMap[string, *UserBean]()

func token(hc *tlnet.HttpContext) {
	username, password := hc.PostParamTrimSpace("username"), hc.PostParamTrimSpace("password")
	var errstring = ""
	if username != "" && password != "" {
		data := `{"name": "` + username + `", "password": "` + password + `", "domain": "tlnet.top"}`
		//调用tim后台获得登录token
		if _r, err := gohttputil.HttpPostParam([]byte(data), true, conf.TimTokenUrl, timadminauth, nil); err == nil {
			if ta, _ := util.JsonDecode[*stub.TimAck](_r); ta != nil {
				if ta.Ok {
					tk := fmt.Sprint(*ta.T)
					sessionUserMap.Put(*ta.N, tk)
					sessionMap.Put(tk, newUserBean(*ta.N))

					if activeMap.Has(*ta.N) {
						detect(*ta.N)
					}

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
	token, topic, _gtype, icon, mode := hc.PostParamTrimSpace("token"), hc.PostParamTrimSpace("topic"), hc.PostParamTrimSpace("gtype"), hc.PostParamTrimSpace("logo"), hc.PostParamTrimSpace("mode")
	gtype := int8(2)
	var node = ""
	if u, ok := sessionMap.Get(token); ok {
		node = u.node
	} else {
		hc.ResponseString("1")
		return
	}
	if node != "" && icon != "" && topic != "" {
		if _gtype == "1" && mode == "" {
			gtype = 1
		}
		data := `{"node": "` + node + `", "topic": "` + topic + `", "domain": "tlnet.top","gtype":` + fmt.Sprint(gtype) + `}`
		//调用tim后台建群接口
		if _r, err := gohttputil.HttpPostParam([]byte(data), true, conf.TimNewRoomUrl, timadminauth, nil); err == nil {
			if ta, _ := util.JsonDecode[*stub.TimAck](_r); ta != nil {
				if ta.Ok {
					rb := &stub.TimRoomBean{Cover: &icon}
					if mode != "" {
						kind := int64(1)
						rb.Kind = &kind
					}
					//调用tim后台修改群资料接口
					gohttputil.HttpPostParam(util.JsonEncode(&roomBean{Unode: node, Gnode: *ta.N, RoomBean: rb}), true, conf.TimNewRoomInfoUrl, timadminauth, nil)
					if mode == "" {
						orm.Insert(&webtimroom{Account: *ta.N, Gtype: gtype, Cover: icon, Found: node, Topic: topic})
					} else {
						orm.Insert(&webtimliveroom{Account: *ta.N, Gtype: gtype, Cover: icon, Found: node, Topic: topic})
					}
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
		gohttputil.HttpPostParam(util.JsonEncode(&userBean{Node: node, UserBean: &stub.TimUserBean{Name: &nick, Cover: &icon}}), true, conf.TimModifyUserInfoUrl, timadminauth, nil)
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

func userslist(hc *tlnet.HttpContext) {
	if as, _ := orm.SelectsByIdLimit[webtimuser](0, 1<<15); as != nil {
		us := make([]*user, 0)
		for _, v := range as {
			u := &user{Id: v.Id, Account: v.Account, Cover: v.Cover, Nickname: v.Nickname}
			if activeMap.Has(v.Account) {
				u.Active = 1
			}
			us = append(us, u)
		}
		sort.Slice(us, func(i, j int) bool {
			return int64(us[i].Active)<<62|us[i].Id > int64(us[j].Active)<<62|us[j].Id
		})
		hc.ResponseString(string(util.JsonEncode(us)))
	}
}

func roomlist(hc *tlnet.HttpContext) {
	if as, _ := orm.SelectsByIdLimit[webtimroom](0, 1<<15); as != nil {
		hc.ResponseString(string(util.JsonEncode(as)))
	}
}

var imageutil = &image.Image{ResizeFilter: image.MitchellNetravali}

func upcover(hc *tlnet.HttpContext) {
	if file, head, err := hc.FormFile("coverfile"); err == nil {
		var buf bytes.Buffer
		io.Copy(&buf, file)
		if buf.Len() > 10*1<<20 {
			return
		}
		bs := buf.Bytes()
		if data, err := imageutil.Resize(buf.Bytes(), 400, 400, 0); err == nil {
			bs = data
		}
		filename := fmt.Sprint("webtim/img/", util.CRC32(util.Int64ToBytes(util.RandId())), "_", head.Filename)
		if wc, err := wfsclient.Append(&wfstub.WfsFile{Data: bs, Name: filename}); err == nil && wc.Ok {
			hc.ResponseString(filename)
			return
		}
	}
	hc.ResponseString("0")
}

func main() {
	if conf.NotifyListen != "" {
		go AdminStart(conf.NotifyListen)
	}
	go detectTicker()
	Start(fmt.Sprint(":", conf.Listen))
}

var wfsclient *client.Client

func initwfs() (err error) {
	if wfsclient, err = client.NewConnect(conf.WfsTls, conf.WfsHost, conf.WfsPort, conf.WfsUser, conf.WfsPwd); err != nil {
		logging.Error(err)
	}
	return
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
	TimNewRoomUrl        string `json:"timNewRoom"`
	TimNewRoomInfoUrl    string `json:"timModifyRoomInfo"`
	TimTokenUrl          string `json:"timToken"`
	TimVroomUrl          string `json:"timVroom"`
	TimDetectUrl         string `json:"timDetect"`

	TldbAddr         string `json:"tldbAddr"`
	TldbAuth         string `json:"tldbAuth"`
	TldbTls          bool   `json:"tldbTls"`
	TimadminUsername string `json:"timadminUsername"`
	TimadminPassword string `json:"timadminPassword"`
	Listen           int    `json:"listen"`
	NotifyListen     string `json:"notifyListen"`
	WfsHost          string `json:"wfshost"`
	WfsPort          int    `json:"wfsport"`
	WfsTls           bool   `json:"wfstls"`
	WfsUser          string `json:"wfsuser"`
	WfsPwd           string `json:"wfspassword"`
	WfsAccessUrl     string `json:"wfsaccessurl"`
}

func parseconf(c string) (err error) {
	var bs []byte
	if bs, err = util.ReadFile(c); err == nil {
		conf, err = util.JsonDecode[*confBean](bs)
	}
	if err != nil {
		panic("webtim conf init error")
	}
	return
}

func detectTicker() {
	ticker := time.NewTicker(1 * time.Minute)
	type tk struct {
		Nodes []string `json:"nodes"`
	}
	for {
		select {
		case <-ticker.C:
			func() {
				defer func() { recover() }()
				nodes := make([]string, 0)
				activeMap.Range(func(k string, v int8) bool {
					nodes = append(nodes, k)
					return true
				})
				if length := len(nodes); length > 0 {
					if length > 1000 {
						for i := 0; i < length; i += 1000 {
							if i+1000 < length {
								detect(nodes[i : i+1000]...)
							} else {
								detect(nodes[i:length]...)
								break
							}
						}
					} else {
						detect(nodes...)
					}
				}
			}()
		}
	}
}

func detect(nodes ...string) {
	type tk struct {
		Nodes []string `json:"nodes"`
	}
	gohttputil.HttpPostParam(util.JsonEncode(&tk{Nodes: nodes}), true, conf.TimDetectUrl, timadminauth, nil)
}
