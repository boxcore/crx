﻿//@huntbao @mknote
//All right reserved
(function($) {
    'use strict';
    var _rootWin = window;
    /**
     * 每个元素替换样式后，需要替换他的‘background-repeat: no-repeat no-repeat;’
     * 因为在ie8之前及chrome,ff旧版本不支持background-repeat有2个参数（http://www.css88.com/book/css/properties/background/background-repeat.htm）
     * 这样会导致使用默认值repeat使得界面样式出错
     *  不知道为什么在使用 el.style.backgroundRepeat 或 $(el).css('background-repeat','no-repeat') 还是background-repeat: no-repeat no-repeat; 所以强行替换返回的文本字符串
     */
    var regBackgroundRepeat = new RegExp('background-repeat: no-repeat no-repeat;', 'ig')
    window.maikuClipper = {
        init: function() {
            var self = this;
            $(document).keydown(function(e) {
                if (e.ctrlKey && e.shiftKey && e.keyCode == 88 /*x*/ ) {
                    var port = chrome.extension.connect({
                        name: 'createpopup'
                    });
                    port.postMessage();
                    self.createPopup();
                }
            });
            self.addWindowEventListener();
        },
        getAllImages: function() {
            var imgs = document.querySelectorAll('img'),
                filteredImg = {},
                filteredImgTitles = [],
                isToSave = function(url) {
                    var suffix = url.substr(url.length - 4);
                    return /^\.(gif|jpg|png)$/.test(suffix);
                }
            for (var i = 0, img, l = imgs.length, src; i < l; i++) {
                img = imgs[i];
                src = img.src;
                // if (!isToSave(src)) continue; //有些图片没有扩展名
                if (filteredImg[src]) continue;
                filteredImg[src] = 1;
                filteredImgTitles.push(img.title || img.alt || '');
            }
            var port = chrome.extension.connect({
                name: 'allimages'
            });
            port.postMessage({
                imgs: Object.keys(filteredImg),
                imgTitles: filteredImgTitles,
                title: document.title,
                sourceurl: location.href
            });
        },
        getImagebyUrl: function(url, selector) {
            var imgs = document.querySelectorAll(selector || 'img');
            for (var i = 0, l = imgs.length; i < l; i++) {
                if (imgs[i].src == url) {
                    return imgs[i];
                }
            }
        },
        getAllLinks: function() {
            var self = this,
                links = document.querySelectorAll('a'),
                sendObj = {
                    sourceurl: location.href
                },
                linkArr = [];
            for (var i = 0, l = links.length, a; i < l; i++) {
                linkArr.push(self.getSendObjByLink(links[i]));
            }
            sendObj.links = linkArr;
            sendObj.title = document.title;
            var port = chrome.extension.connect({
                name: 'alllinks'
            });
            port.postMessage(sendObj);
        },
        getLinkInfoByUrl: function(url) {
            var self = this,
                a = self.getLinkByUrl(url);
            if (a) {
                var port = chrome.extension.connect({
                    name: 'link'
                }),
                    sendObj = self.getSendObjByLink(a);
                sendObj.sourceurl = location.href;
                port.postMessage(sendObj);
            }
        },
        getLinkByUrl: function(url, selector) {
            var as = document.querySelectorAll(selector || 'a');
            for (var i = 0, l = as.length; i < l; i++) {
                if (as[i].href == url) {
                    return as[i];
                }
            }
        },
        getSendObjByLink: function(link) {
            return {
                linkUrl: link.href,
                title: link.title || link.text || document.title,
                text: link.text || link.href
            }
        },
        getSelectedContent: function() {
            var self = this,
                commonAncestorContainer = self.getSelectionContainer(),
                content = '',
                title = '';
            if (commonAncestorContainer === null || $(commonAncestorContainer).text() === '') {
                content = false;
            } else if (commonAncestorContainer.nodeType === 3) {
                content = $(commonAncestorContainer).text();
                title = document.title; //content
            } else if (commonAncestorContainer.nodeType === 1) {
                var selectedHTML = self.getSelectedHTML();
                var tempNode = $('<div>', {
                    html: selectedHTML
                }).insertAfter($(commonAncestorContainer));
                self.getHTMLByNode(tempNode);
                var html = tempNode.html();
                title = document.title; //tempNode.text();
                tempNode.remove();
                content = html;
            }
            if (content) {
                var port = chrome.extension.connect({
                    name: 'getselectedcontent'
                });
                port.postMessage({
                    title: title,
                    sourceurl: location.href,
                    content: content
                });
            }
        },
        getSelectionContainer: function() {
            var container = null;
            if (window.getSelection) {
                var selectionRange = window.getSelection();
                if (selectionRange.rangeCount > 0) {
                    var range = selectionRange.getRangeAt(0);
                    container = range.commonAncestorContainer;
                }
            } else {
                if (document.selection) {
                    var textRange = document.selection.createRange();
                    container = textRange.parentElement();
                }
            }
            return container;
        },
        getSelectedHTML: function() {
            var userSelection;
            if (window.getSelection) {
                //W3C Ranges
                userSelection = window.getSelection();
                //Get the range:
                if (userSelection.getRangeAt) {
                    var range = userSelection.getRangeAt(0);
                } else {
                    var range = document.createRange();
                    range.setStart(userSelection.anchorNode, userSelection.anchorOffset);
                    range.setEnd(userSelection.focusNode, userSelection.focusOffset);
                }
                //And the HTML:
                var clonedSelection = range.cloneContents();
                var div = document.createElement('div');
                div.appendChild(clonedSelection);
                return div.innerHTML;
            } else if (document.selection) {
                //Explorer selection, return the HTML
                userSelection = document.selection.createRange();
                return userSelection.htmlText;
            } else {
                return '';
            }
        },
        getPageContent: function() {
            var self = this,
                port = chrome.extension.connect({
                    name: 'getpagecontent'
                });
            var h1 = $('h1').eq(0);
            port.postMessage({
                title:  document.title,
                sourceurl: location.href,
                content: self.getHTMLByNode($(document.body))
            });
        },
        createMkClipWrap: function(zIndex, height) {
            if ($(document.body).is('frameset')) {
                return null;
            }
            var self = this;
            if (!self.closePopup) {
                self.closePopup = function() {
                    $(document).unbind('keydown.maikuclipperpopup');
                    self.removeInspector();
                    self.isCreatedPopup = false;
                    self.popupInstance.fadeOut(function(e) {
                        $(this).remove();
                    });
                }
            }
            var el = $('<div mkclip="true" style="position:fixed;right:8px;top:8px;width:450px;height:' + height + 'px;\
            background-color:rgba(0,0,0,.5);z-index:;border-radius:1px;\
            box-shadow:rgba(51, 51, 51, 0.498039) 0px 0px 8px 0px;overflow:hidden;"></div>').css('z-index', zIndex).hide().appendTo(document.body).fadeIn();
            var iframe = $('<iframe frameborder="0" style="width:100%;height:100%;"></iframe>').appendTo(el),
                iframeWin = iframe[0].contentWindow,
                iframeDoc = iframe[0].contentDocument || iframeWin.document;

            return {
                wrap: el,
                iframe: iframe
            }
        },
        createLoadingEl: function(zIndex) {
            var obj = this.createMkClipWrap(zIndex, 150);
            if (obj == null) return null;
            obj.iframe[0].src = chrome.extension.getURL('loading.html');
            return obj.wrap;
        },
        createClipEl: function(zIndex) {
            var self = this;
            var obj = this.createMkClipWrap(zIndex, 450);
            if (obj == null) return null;
            obj.iframe[0].src = chrome.extension.getURL('popup.html');
            self.initDivHeight = parseInt(obj.wrap.css('height'));
            var judgeHeight = function(h) {
                if (h < 304) return 304;
                if (h > 644) return 644;
                return h;
            }
            self.changeHeight = function(changeStep) {
                obj.wrap.css('height', judgeHeight(self.initDivHeight + changeStep));
            }
            self.positionTop = function() {
                obj.wrap.css({
                    top: 8,
                    bottom: 'auto'
                });
            }
            self.positionBottom = function() {
                obj.wrap.css({
                    top: 'auto',
                    bottom: 8
                });
            }

            $(document).bind('keydown.maikuclipperpopup', function(e) {
                if (e.keyCode == 27) {
                    self.closePopup();
                }
            });
            return obj.wrap;
        },
        createPopup: function() {
            var self = this;
            if (self.isCreatedPopup) return;
            self.popupZIndex = 20120726;
            self.isCreatedPopup = true;
            var errorMessage = "page isn't be support",
                loadingEl, ClipEl;

            function showPage() {
                if (self.isLoadComplated == true) {
                    if (ClipEl) return true;
                    if (loadingEl) loadingEl.remove();
                    self.popupInstance = ClipEl = self.createClipEl(self.popupZIndex);
                    if (ClipEl == null) throw Error(errorMessage);
                    return true;
                } else {
                    if (loadingEl) return false;
                    self.popupInstance = loadingEl = self.createLoadingEl(self.popupZIndex);
                    if (loadingEl == null) throw Error(errorMessage);
                    return false;
                }
            }
            try {
                showPage();

                var handler = setInterval(function() {
                    if (showPage()) {
                        clearInterval(handler);
                    }
                }, 500);
            } catch (e) {
                self.isCreatedPopup = false;
                if (e.message == errorMessage) {
                    self.tipsReadyError();
                }
            }
        },
        addWindowEventListener: function() {
            var self = this;
            window.addEventListener('message', function(e) {
                switch (e.data.name) {
                    case 'createinspectorfrommaikupopup':
                        self.createInspector(e.data.autoExtractContent);
                        break;
                    case 'changeheightfrommaikupopup':
                        self.changeHeight(e.data.param);
                        break;
                    case 'stopchangeheightfrommaikupopup':
                        self.initDivHeight = parseInt(self.popupInstance.css('height'));
                        break;
                    case 'closefrommaikupopup':
                        self.closePopup();
                        break;
                    case 'resetfrommaikupopup':
                        self.clearMarks();
                        break;
                    case 'gotopfrommaikupopup':
                        self.positionTop();
                        break;
                    case 'gobottomfrommaikupopup':
                        self.positionBottom();
                        break;
                    case 'savenotefrommaikupopup':
                        self.saveNote(e.data.notedata);
                        break;
                    case 'showinspectorfrommaikupopup':
                        self.showInspector();
                        break;
                    case 'hideinspectorfrommaikupopup':
                        self.hideInspector();
                        break;
                    case 'hidemaskfrommaikupopup':
                        self.mask && self.mask.hide();
                        break;
                    case 'pageCompleted':
                        self.isLoadComplated = true;
                        break;
                    default:
                        break;
                }
            }, true);
        },
        createInspector: function(autoExtractContent) {
            var self = this,
                body = $(document.body);
            self.cover = $('<div mkclip="true" cover></div>').css({
                position: 'absolute',
                top: 0,
                left: 0,
                opacity: 0,
                'z-index': self.popupZIndex - 1
            });
            self.mask = $('<div mkclip="true" mask></div>').css({
                'border-radius': 5,
                border: '3px solid #a2cca2',
                position: 'absolute',
                top: -9999,
                left: -9999,
                width: 0,
                height: 0,
                'z-index': self.popupZIndex - 1,
                background: 'transparent'
            });
            var backgroundImageSrc = chrome.extension.getURL('css/images/sprite.png'),
                //'chrome-extension://__MSG_@@extension_id__/sprites.png'
                //遮罩半透明
                markInner = $('<div mkclip="true" markInner></div>').css({
                    background: '#ccffcc',
                    height: '100%',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    opacity: 0.35,
                    width: '100%'
                }),
                //扩展按钮
                markExpandor = $('<div mkclip="true" markExpandor></div>').css({
                    background: 'url(' + backgroundImageSrc + ') -120px -66px no-repeat',
                    height: 20,
                    width: 20,
                    cursor: 'pointer',
                    position: 'absolute',
                    top: 1,
                    left: 1,
                    'z-index': self.popupZIndex - 1
                }).attr('title', chrome.i18n.getMessage('MarkExpandorTip')),
                //关闭按钮
                markClose = $('<span mkclip="true" markClose></span').css({
                    background: 'url(' + backgroundImageSrc + ') -120px -44px no-repeat',
                    height: 20,
                    width: 20,
                    cursor: 'pointer',
                    position: 'absolute',
                    top: 1,
                    left: 23,
                    'z-index': self.popupZIndex - 1
                }).attr('title', chrome.i18n.getMessage('CancelTip'));
            //最外层的框
            self.mark = $('<div mkclip="true" mark></div>').css({
                'border-radius': 3,
                border: '3px solid #a2cca2',
                position: 'absolute',
                top: -9999,
                left: -9999,
                'z-index': self.popupZIndex - 1,
                background: 'transparent'
            }).append(markInner).append(markExpandor).append(markClose);
            //有些网页会把div强制为position:relative 导致选择区显示出错
            //手动将position强制为默认值
            //测试 http://www.smashingmagazine.com/2013/02/28/desktop-wallpaper-calendar-march-2013/
            self.markContainer = $('<div mkclip="true" style="position:static" markContainer></div>').appendTo(body).append(self.cover).append(self.mask);
            self.markedElements = {}; //save all marked page element
            self.marks = {}; //save all marks
            self.markCount = 0;
            self.body = body;
            body.bind('mousemove.maikuclippermark', function(e) {
                self.mouseMoveMarkHandler(e);
            }).bind('click.maikuclippermark', function(e) {
                self.clickMarkHandler(e);
            }).bind('mouseleave.maikuclippermark', function(e) {
                self.mask.hide();
            });
            if (autoExtractContent) {
                //extract content
                var extract = self.extractContent(document);
                if (extract.isSuccess) {
                    var extractedContent = extract.content.asNode();
                    if (extractedContent.nodeType == 3) {
                        extractedContent = extractedContent.parentNode;
                    }
                    setTimeout(function() {
                        var title = document.title; //&& document.title.split('-')[0];
                        self.addMark($(extractedContent), self.mark.clone(), title.trim());
                    }, 0);
                } else {
                    //没有选择的时候选择整个网页
                    var extractedContent = document.body;
                    setTimeout(function() {
                        var title = document.title;
                        self.addMark($(extractedContent), self.mark.clone(), title.trim());
                    }, 0);
                }
            }
        },
        hideInspector: function() {
            var self = this;
            if (!self.markContainer) return;
            self.markContainer.hide();
            self.body.unbind('mousemove.maikuclippermark').unbind('click.maikuclippermark');
        },
        showInspector: function() {
            var self = this;
            if (!self.markContainer) return;
            self.markContainer.show();
            self.body.bind('mousemove.maikuclippermark', function(e) {
                self.mouseMoveMarkHandler(e);
            }).bind('click.maikuclippermark', function(e) {
                self.clickMarkHandler(e);
            })
        },
        removeInspector: function() {
            var self = this;
            if (!self.markContainer) return;
            self.markContainer.remove();
            self.markedElements = {};
            self.marks = {};
            self.markCount = 0;
            self.body.unbind('mousemove.maikuclippermark').unbind('click.maikuclippermark');
        },
        mouseMoveMarkHandler: function(e) {
            var self = this;
            self.cover.show();
            self.mask.show();
            var target = self.elementFromPoint(e),
                isMark = target.attr('mkclip'),
                isIgnore = false;
            if (target.is('body, html') || isMark) {
                isIgnore = true;
            }
            //mouse in mark or remove-mark
            //hide cover so that remove-mark could be clicked
            if (!isMark && !isIgnore) {
                self.attachBox(target, self.mask);
            } else {
                self.cover.hide();
                self.mask.hide();
            }
        },
        clickMarkHandler: function(e) {
            var self = this,
                target = self.elementFromPoint(e),
                isIgnore = false;
            if (target.is('iframe, frame')) {
                console.log('无法获取iframe及frame里面的内容');
                return false;
            }
            if (target.is('body, html')) {
                isIgnore = true;
            }
            self.removeMarkInElement(target);
            if (!isIgnore) {
                self.addMark(target, self.mark.clone());
                return false;
            }
            e.stopPropagation();
        },
        addMark: function(target, mark, title) {
            var self = this,
                uid = 'mkmark_' + self.markCount;
            self.markContainer.append(mark);
            self.attachBox(target, mark);
            self.markCount++;
            //var date = new Date();
            var html = self.getHTMLByNode(target);
            //console.log(new Date() - date)
            self.sendContentToPopup(uid, html, true, title);
            self.markedElements[uid] = target;
            self.marks[uid] = mark;
            mark.data('uid', uid).click(function(e) {
                self.delMark(mark);
                return false;
            });
            $(mark.children()[1]).click(function(e) {
                self.parentMark(mark);
                return false;
            });
        },
        delMark: function(mark) {
            var self = this,
                uid = mark.data('uid');
            self.sendContentToPopup(uid);
            mark.remove();
            delete self.markedElements[uid];
        },
        clearMarks: function() {
            var self = this;
            self.markContainer.html('').append(self.cover).append(self.mask);
            self.markedElements = {};
            self.marks = {};
            self.markCount = 0;
        },
        parentMark: function(mark) {
            var self = this,
                uid = mark.data('uid'),
                parent = self.markedElements[uid].parent();
            if (parent.is('html')) return;
            self.removeMarkInElement(parent);
            self.addMark(parent, self.mark.clone());
        },
        removeMarkInElement: function(el) {
            var self = this,
                markedPageElementInParent = {};
            for (var uid in self.markedElements) {
                if (el.find(self.markedElements[uid]).length > 0) {
                    markedPageElementInParent[uid] = true;
                }
            }
            for (var uid in self.marks) {
                if (markedPageElementInParent[uid]) {
                    self.delMark(self.marks[uid]);
                }
            }
        },
        elementFromPoint: function(e) {
            var self = this;
            self.cover.hide();
            self.mask.hide();
            var pos = {
                top: e.pageY - $(window).scrollTop(),
                left: e.pageX
            },
            target = $(document.elementFromPoint(pos.left, pos.top));
            self.cover.show();
            self.mask.show();
            return target;
        },
        attachBox: function(target, el) {
            var self = this,
                body = self.body,
                size = {
                    height: target.outerHeight(),
                    width: target.outerWidth()
                },
                pos = {
                    left: target.offset().left,
                    top: target.offset().top
                }
                //box on the page edge
                //ajust the pos and size order to show the whole box
            var bodyOuterWidth = body.outerWidth();
            if (pos.left == 0) {
                if (size.width >= bodyOuterWidth) {
                    size.width = bodyOuterWidth - 6;
                }
            } else if (pos.left + size.width >= bodyOuterWidth) {
                size.width = bodyOuterWidth - pos.left - 6;
            } else {
                pos.left -= 3;
            }
            if (pos.top == 0) {
                size.height -= 3;
            } else {
                pos.top -= 3;
            }
            el.css({
                left: pos.left,
                top: pos.top,
                height: size.height,
                width: size.width
            });
        },
        getHTMLByNode: function(node) {
            var self = this,
                filterTagsObj = self.filterTagsObj,
                nodeTagName = node[0].tagName.toLowerCase();
            if (filterTagsObj[nodeTagName]) {
                return '';
            }
            var allEles = node[0].querySelectorAll('*'),
                allElesLength = allEles.length,
                nodeCSSStyleDeclaration = getComputedStyle(node[0]);
            if (allElesLength == 0) {
                //no child
                if (!/^(img|a)$/.test(nodeTagName) && node[0].innerHTML == 0 && nodeCSSStyleDeclaration['background-image'] == 'none') {
                    return '';
                }
            }
            var cloneNode = node.clone(),
                allElesCloned = cloneNode[0].querySelectorAll('*'),
                el, cloneEl, color, cssStyleDeclaration, styleObj = {},
                cssValue, saveStyles = self.saveStyles;
            for (var j = allElesLength - 1, tagName; j >= 0; j--) {
                cloneEl = allElesCloned[j];
                tagName = cloneEl.tagName.toLowerCase();
                if (filterTagsObj[tagName] || cloneEl.getAttribute('mkclip')) {
                    $(cloneEl).remove();
                    continue;
                }
                if (tagName == 'br') {
                    continue;
                }
                el = allEles[j];
                cssStyleDeclaration = getComputedStyle(el);
                cloneEl = $(cloneEl);
                color = cssStyleDeclaration.color;
                styleObj = {};
                if (tagName == 'img') {
                    cloneEl[0].src = cloneEl[0].src;
                    cloneEl.css({
                        width: cssStyleDeclaration.width,
                        height: cssStyleDeclaration.height,
                        float: cssStyleDeclaration.float,
                        background: cssStyleDeclaration.background,
                    });
                    continue;
                }
                for (var cssProperty in saveStyles) {
                    cssValue = cssStyleDeclaration[cssProperty];
                    if (cssValue == saveStyles[cssProperty]) continue;
                    if (cssProperty == 'color') {
                        styleObj[cssProperty] = (color == 'rgb(255,255,255)' ? '#000' : color);
                        continue;
                    }
                    styleObj[cssProperty] = cssValue;
                }
                if (tagName == 'a') {
                    cloneEl.attr('href', el.href);
                } else if (/^(ul|ol|li)$/.test(tagName)) {
                    styleObj['list-style'] = cssStyleDeclaration['list-style'];
                }
                cloneEl.css(styleObj);
                self.removeAttrs(cloneEl);
            }
            if (nodeTagName == 'body') {
                return cloneNode[0].innerHTML.replace(regBackgroundRepeat, 'background-repeat: no-repeat;');
            } else {
                color = nodeCSSStyleDeclaration.color;
                styleObj = {};
                for (var cssProperty in saveStyles) {
                    cssValue = nodeCSSStyleDeclaration[cssProperty];
                    if (cssValue == saveStyles[cssProperty]) continue;
                    if (/^(margin|float)$/.test(cssProperty)) continue;
                    if (cssProperty == 'color') {
                        styleObj[cssProperty] = (color == 'rgb(255,255,255)' ? '#000' : color);
                        continue;
                    }
                    styleObj[cssProperty] = cssValue;
                }
                cloneNode.css(styleObj);
                self.removeAttrs(cloneNode);
                if (/^(img)$/.test(nodeTagName)) {
                    var imgSrc = $(cloneNode[0]).attr('src');
                    if (!/^http(s)?:\/\//.test(imgSrc)) {
                        $(cloneNode[0]).attr('src', window.location.protocol + '//' + window.location.host + '/' + imgSrc);
                    }
                }
                return cloneNode[0].outerHTML.replace(regBackgroundRepeat, 'background-repeat: no-repeat;');
            }
        },
        filterTagsObj: {
            style: 1,
            script: 1,
            link: 1,
            iframe: 1,
            frame: 1,
            frameset: 1,
            noscript: 1,
            head: 1,
            html: 1,
            applet: 1,
            base: 1,
            basefont: 1,
            bgsound: 1,
            blink: 1,
            ilayer: 1,
            layer: 1,
            meta: 1,
            object: 1,
            embed: 1,
            input: 1,
            textarea: 1,
            button: 1,
            select: 1,
            canvas: 1,
            map: 1
        },
        saveStyles: {
            'background': 'rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box',
            'border': '0px none rgb(0, 0, 0)',
            'bottom': 'auto',
            'box-shadow': 'none',
            'clear': 'none',
            'color': 'rgb(0, 0, 0)',
            'cursor': 'auto',
            'display': '',
            //consider inline tag or block tag, this value must have
            'float': 'none',
            'font': '',
            //this value must have, since it affect the appearance very much and style inherit is very complex
            'height': 'auto',
            'left': 'auto',
            'letter-spacing': 'normal',
            'line-height': 'normal',
            'margin': '',
            'max-height': 'none',
            'max-width': 'none',
            'min-height': '0px',
            'min-width': '0px',
            'opacity': '1',
            'outline': 'rgb(0, 0, 0) none 0px',
            'overflow': 'visible',
            'padding': '',
            'position': 'static',
            'right': 'auto',
            'table-layout': 'auto',
            'text-align': 'start',
            'text-decoration': '',
            'text-indent': '0px',
            'text-shadow': 'none',
            'text-overflow': 'clip',
            'text-transform': 'none',
            'top': 'auto',
            'vertical-align': 'baseline',
            'visibility': 'visible',
            'white-space': 'normal',
            'width': 'auto',
            'word-break': 'normal',
            'word-spacing': '0px',
            'word-wrap': 'normal',
            'z-index': 'auto',
            'zoom': '1'
        },
        removeAttrs: function(node) {
            var removeAttrs = ['id', 'class', 'height', 'width'];
            for (var i = 0, l = removeAttrs.length; i < l; i++) {
                node.removeAttr(removeAttrs[i]);
            }
            return node;
        },
        extractContent: function(doc) {
            var ex = new ExtractContentJS.LayeredExtractor();
            ex.addHandler(ex.factory.getHandler('Heuristics'));
            var res = ex.extract(doc);
            return res;
        },
        sendContentToPopup: function(uid, content, add, title) {
            //cannot send data directly to popup page, so connect to background page first
            if (add && !content) return; //add blank node, return;
            var port = chrome.extension.connect({
                name: 'actionfrompopupinspecotr'
            });
            port.postMessage({
                uid: uid,
                content: content,
                add: add,
                title: title
            });
        }, 
        saveNote: function(notedata) {
            var self = this,
                port = chrome.extension.connect({
                    name: 'savenotefrompopup'
                });
            //close popup
            self.closePopup();
            notedata.sourceurl = location.href;
            port.postMessage(notedata);
        },
        tipsReadyError: function() {
            var port = chrome.extension.connect({
                name: 'maikuclipperisnotready'
            });
            var data = {
                'key': 'notClipPageInfo'
            }
            port.postMessage(data);
        }
    }
    maikuClipper.init();
    $(function() {
        maikuClipper.isLoadComplated = true;
    });
})(jQuery);