/*
 *  Copyright (C) 2016  Leonardosnt
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

'use strict';
const md5 = require('md5');
const got = require('got');
const fs = require('fs');
const path = require('path');
const co = require('co');

// const socket = require('socket.io-client')('http://localhost:3000');
// let socketIsReady = false;
const apiUrl = 'http://api.fanyi.baidu.com/api/trans/vip/translate';
const appid = '20160416000018868';
const key = 'Mg0nf6gKFSXLwi7IpXB7';

// socket.on('connect', function() {
//     socketIsReady = true;
// });

function dConsole(msg) {
    // if (socketIsReady) {
    //     socket.emit('log', msg);
    // }
}

/**
 * [getSign description]
 * @param  {String} query [要查的词]
 * @param  {String} salt  [撒的盐]
 * @return {String}       [description]
 */
function getSign(query, salt) {
    let str = appid + query + salt + key;

    dConsole(str);
    return md5(str);
}

function* baidufanyi(query, to, fromLang) {
    const salt = Math.floor(Date.now() / 1000);
    const sign = getSign(query, salt);

    fromLang = fromLang || 'auto';
    let result = (yield got(
        apiUrl +
        '?q=' + encodeURIComponent(query) +
        '&from=' + fromLang +
        '&to=' + to +
        '&appid=' + appid +
        '&salt=' + salt +
        '&sign=' + encodeURIComponent(sign))).body;

    dConsole({
        q: query,
        from: fromLang,
        to: to,
        appid: appid,
        salt: salt,
        sign: sign
    });
    dConsole(result);

    result = JSON.parse(result);
    if (result['trans_result']) {
        return result.trans_result[0].dst;
    }

    return '没有找到翻译';
}


module.exports = (pluginContext) => {
    const shell = pluginContext.shell;
    const app = pluginContext.app;
    let result = '';
    let html;
    let renderFunc;

    function startup() {
        html = fs.readFileSync(path.join(__dirname, 'preview.html'), 'utf8');
        dConsole('百度翻译准备好了');
    }

    function renderPreview(id, payload, render) {
        let preview;

        preview = html.replace('%result%', result);

        // dConsole(preview);
        render(preview);
        renderFunc = render;
    }

    function search(query, res) {
        const queryTrim = query.trim();

        dConsole(query);
        if (queryTrim.length === 0) {
            return;
        }

        res.add([{
            id: queryTrim,
            payload: 'en->zh',
            title: queryTrim,
            desc: '将' + queryTrim + '翻译为中文',
            preview: true
        },{
            id: queryTrim,
            payload: 'zh->en',
            title: queryTrim,
            desc: '将' + queryTrim + '翻译为英文',
            preview: true
        }]);
    }

    function execute(id, payload) {
        switch (payload) {
            case 'en->zh':
                co(function*() {
                    result = yield baidufanyi(id, 'zh');
                    dConsole(result);
                    renderPreview(id, payload, renderFunc);
                });
                break;
            case 'zh->en':
                co(function*() {
                    result = yield baidufanyi(id, 'en');
                    dConsole(result);
                    renderPreview(id, payload, renderFunc);
                });
                break;
            default:

        }

    }

    return {
        startup,
        search,
        execute,
        renderPreview
    };
};
