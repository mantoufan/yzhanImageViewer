/*
 * jQuery Plugin：jquery.yzhanImageViewer.js 1.0.2
 * https://github.com/mantoufan/yzhanImageViewer
 *
 * Copyright 2020, 吴小宇 Shon Ng
 * https://github.com/mantoufan
 * 
 * Date: 2022-08-18T12:30Z
 */
(function ($) {
    var $imageViewer = $('<div>').addClass('yz-img-viewer'),
        $imageViewerBg = $('<div>').addClass('yz-img-viewer-bg'),
        $imageList = $('<div>').addClass('yz-img-list').appendTo($imageViewer),
        $dotIndicator = $('<div>').addClass('yz-dot-indicator').appendTo($imageViewer),
        $debug = $('<div>').addClass('yz-debug').appendTo($imageViewer),
        $switchPrev = $('<div>').addClass('yz-img-switch yz-img-switch-prev').appendTo($imageViewer),
        $switchNext = $('<div>').addClass('yz-img-switch yz-img-switch-next').appendTo($imageViewer),
        $imageAll = null,
        selector = '',
        data = {}

    $.fn.extend({
        "yzhanImageViewer": function (opt) {
            var opt = {
                    selector: opt.selector || 'img',
                    attrSelector: opt.attrSelector || 'src',
                    parentSelector: opt.parentSelector,
                    className: opt.className,
                    controls: $.extend({
                        reverseDrag: {x: false, y: false},
                        canChange: true
                    }, opt.controls),
                    onChange: opt.onChange,
                    onOpen: opt.onOpen,
                    onClose: opt.onClose,
                    debug : opt.debug || false
                }, clickTimer = null;

                selector = opt.selector;

                this.off('click').on('click', selector, function(e) {
                    var $current = $(this), $parent = $(e.delegateTarget);
                    if (opt.parentSelector) {
                        $parent = $current.parents(opt.parentSelector).eq(0);
                    }
                    $imageViewer.attr('class' , 'yz-img-viewer' + (opt.className && ' ' + opt.className || ''));
                    opt.debug ? $debug.show() : $debug.hide();
                    $.fn.yzhanImageViewer.open({
                        $current: $current,
                        $all: $imageAll = opt.controls.canChange ? $parent.find(selector) : $current,
                        onOpen: opt.onOpen,
                        attrSelector: opt.attrSelector
                    });
                    $imageViewer.off('click').on('click', onClickImageViewer);
                    $imageViewer.off('mousedown touchstart mousemove').on('mousedown touchstart', onMoveStartImageViewer);
                    $imageList.off('dblclick mousemove touchend').on('mousemove touchend', throttle(displayControl, 99, true)).on('dblclick', 'div', onDblclickImageList);
                    displayControl(e, true);
                    $switchPrev.off('click').on('click', function(){return switchGo('prev')});
                    $switchNext.off('click').on('click', function(){return switchGo('next')});
                    $dotIndicator.off('click').on('click', 'div', onClickDotIndicator);
                    $(window).on('keydown', onKeydownWindow);
                    return false;
                });

                /**
                 * 当按键时
                 */
                function onKeydownWindow(e) {
                    switch (e.keyCode) {
                        case 37: // ←键 上一张
                            switchGo('prev');
                            break;
                        case 39: // →键 下一张
                            switchGo('next');
                            break;
                        case 82: // R键 还原影像比例到100%
                            scaleImg($imageList.children('.current').children('img'), 1);
                            break;
                        case 27: // ESC键 退出ImageViewer
                            onClickImageViewer.call(this);
                            break;
                        default:
                            break;
                    }
                }

                /**
                 * 当 ImageViewer 被点击时
                 */
                function onClickImageViewer() {
                    clearTimeout(clickTimer);
                    clickTimer = setTimeout(function() {
                        $.fn.yzhanImageViewer.close({
                            $target: $imageAll.eq($imageList.children('.current').index()),
                            onClose: opt.onClose
                        });
                        $(window).off('keydown', onKeydownWindow);
                    }, 199);
                }

                /**
                 * 当 ImageViewer 被按下或触摸开始时
                 * @param {c.Event} e jQuery 封装后的事件对象
                 */
                function onMoveStartImageViewer(e) {
                    var $img = $imageList.children('.current').children('img'), ts = e.originalEvent.touches, movedDistance = {x: 0, y: 0},
                        start = {
                            $img: $img,
                            imgMinLeft: $imageViewer.width() - $img.width() * ($img.data('scale') || 1),
                            imgMinTop: $(window).height() - $img.height() * ($img.data('scale') || 1),
                            x: getXY(e, 'x'), y: getXY(e, 'y')
                        }
                        if (ts && ts.length === 2) {// 双指缩放
                            start = $.extend(start, {
                                distance: Math.sqrt(Math.pow(ts[1].clientX - ts[0].clientX, 2) + Math.pow(ts[1].clientY - ts[0].clientY, 2)),
                                e: e
                            })
                            start.e.pos = start.$img.position();
                        }
                        $imageViewer.on('mousemove touchmove', throttle(function(e) {
                            movedDistance = onMovingImageViewer(e, start);
                        }, 16));
                        $(window).on('mouseup touchend', function() {
                            onMoveEndWindow(start, movedDistance)
                        });
                }
                /**
                 * 当 ImageViewer 被拖动时
                 * @param {c.Event} e jQuery 封装后的事件对象
                 * @param {Object} start 当 ImageViewer 被按下或触摸开始时，获取 初始位置 的相关信息
                 * @return {Object<{x:Number, y:Number}>} 返回被拖动的距离 x-水平方向，y-竖直方向
                 */
                function onMovingImageViewer(e, start) {
                    var $img = start.$img, ts = e.originalEvent.touches, xDistance = 0, yDistance = 0;
                    if (ts && ts.length === 2) {// 双指缩放
                        var newDistance = Math.sqrt(Math.pow(ts[1].clientX - ts[0].clientX, 2) + Math.pow(ts[1].clientY - ts[0].clientY, 2));   
                            start.distance && (xDistance = 0.1) && scaleImg($img, newDistance / start.distance, start.e, true);
                    } else {
                        var imgPosLeft = $img.position().left, imgPosTop = $img.position().top,
                            x = getXY(e, 'x'), y = getXY(e, 'y'), scale = $img.data('scale') || 1, isMoving = true;
                            xDistance = opt.controls.reverseDrag['x'] ? start.x - x : x - start.x, yDistance =  opt.controls.reverseDrag['x'] ? start.y - y : y - start.y;
                            if (xDistance || yDistance) {
                                if (scale > 1) {
                                    if (yDistance < 0 && imgPosTop < 0) {
                                        $img.css('top', Math.min(imgPosTop - yDistance * scale, 0) + 'px');
                                    } else if (yDistance > 0 && imgPosTop > start.imgMinTop) {
                                        $img.css('top', Math.max(imgPosTop - yDistance * scale, start.imgMinTop) + 'px');
                                    }
                                    if (xDistance < 0 && imgPosLeft < 0) {
                                        $img.css('left', Math.min(imgPosLeft - xDistance * scale, 0) + 'px');
                                    } else if (xDistance > 0 && imgPosLeft > start.imgMinLeft + 1) {
                                        $img.css('left', Math.max(imgPosLeft - xDistance * scale, start.imgMinLeft) + 'px');
                                    } else {
                                        isMoving = false;
                                    }
                                } else {  
                                    isMoving = false;
                                }
                                start.x = x;
                                start.y = y;
                                if (isMoving === false) {
                                    $imageList.css('marginLeft', parseFloat($imageList.css('marginLeft')) - xDistance + 'px');
                                }
                            }
                    }
                    return {
                        x: xDistance,
                        y: yDistance
                    }
                }
                /**
                 * 当 ImageViewer 被拖动开始时
                 * @param {Object} start 当 ImageViewer 被按下或触摸开始时，获取 初始位置 的相关信息
                 * @param {Object<{x:Number, y:Number}>} movedDistance 当 ImageViewer 被拖动时，被拖动的距离 x-水平方向，y-竖直方向
                 */
                function onMoveEndWindow(start, movedDistance) {
                    var $img = start.$img, index = Math.round(- parseFloat($imageList.css('marginLeft')) / $imageList.width() + (movedDistance.x < 0 && -.35 || movedDistance.x > 0 && .25 || 0));
                    if(movedDistance.x !== 0 || movedDistance.y !== 0) {
                        setTimeout(function() {
                            clearTimeout(clickTimer);
                            if ($img.data('scale') <= 1) {
                                scaleImg($img, 1);
                            }
                        }, 36);
                    }
                    $.fn.yzhanImageViewer.change({
                        index: index,
                        onChange: opt.onChange
                    });
                    $imageViewer.off('mousemove touchmove');
                    $(window).off('mouseup touchend');
                }
                /**
                 * 当ImageList被双击时
                 * @param {c.Event} e jQuery 封装后的事件对象
                 */
                function onDblclickImageList(e) {
                    var $img = $(this).children('img');
                        scaleImg($img, $img.data('scale') === 2 ? 1 : 2, e);
                        clearTimeout(clickTimer);
                }
                /**
                 * 当ImageList被双击时
                 * @param {c.Event} e jQuery 封装后的事件对象
                 * @param {Boolean} ignoreX 忽略鼠标指针或触摸点的X坐标，尝试显示切换按钮
                 */
                function displayControl(e, ignoreX) {
                    var ar = [$dotIndicator], x = e.clientX, imageViewerOffsetLeft = $imageViewer.offset().left, imageViewerWidth_3 = $imageViewer.width() / 3,
                        len = $imageList.children().length, index = $imageList.children('.current').index(),
                        isTouch = 'ontouchstart' in window;
                    if (!isTouch) {
                        if (ignoreX || x < imageViewerOffsetLeft + imageViewerWidth_3) {
                            index !== 0 && ar.push($switchPrev);
                        }
                        if (ignoreX || x > imageViewerOffsetLeft + imageViewerWidth_3 * 2) {
                            index < len - 1 && ar.push($switchNext);
                        }
                    } 
                    $.each(ar, function(index, $ele) {
                        (ignoreX || $ele.css('display') === 'none') && $ele.stop(true, true).fadeIn().delay(3500).fadeOut()
                        .off('mouseenter touchend').on('mouseenter touchend', function() {
                            $(this).stop(true, true).show();
                            $ele.timer && clearTimeout($ele.timer);
                            isTouch && ($ele.timer = setTimeout(function() {
                                $ele.fadeOut();
                            }, 3500));
                        })
                        .off('mouseleave').on('mouseleave', function() {
                            $(this).stop(true, true).delay(200).fadeOut();
                        })
                    });
                }
                /**
                 * 上下张切换：仅鼠标控制设备显示切换按钮，触屏不显示
                 */
                function switchGo(type) {
                    var index = $imageList.children('.current').index();
                        type === 'prev' ? index-- : index++;
                        $.fn.yzhanImageViewer.change({
                            index: index,
                            onChange: opt.onChange
                        });
                        return false;
                }

                /**
                 * 当小圆点被点击时
                 */
                function onClickDotIndicator() {
                    var index = $(this).index();
                    $.fn.yzhanImageViewer.change({
                        index: index,
                        onChange: opt.onChange
                    });
                    return false;
                }
        }
    });
    
    /**
     * 打开：open
     * @param {jQuey Object} $current 当前对象
     * @param {jQuey Objects} $all 所有对象列表
     * @param {Function} [onOpen] 当 ImageViewer 被打开时触发
     * @param {String} attrSelector 对象地址的属性名
     */
    $.fn.yzhanImageViewer.open = function (opt) {
        var $current = opt.$current,
            $all = opt.$all || $current,
            onOpen = opt.onOpen,
            attrSelector = opt.attrSelector,
            currentIndex = 0, currentClass, $target = $(window.event.target), imgsLen = $all.length;
            preventRollThrough(true);
            $imageList.empty();
            $dotIndicator.empty();
            $all.each(function(index, cur) {
                if ($current.get(0) === cur) {
                    currentIndex = index;
                    currentClass = 'current';
                } else {
                    currentClass = '';
                }
                $('<div>').append($('<img>').attr('src', $(cur).attr(attrSelector)).mousedown(function(e){e.preventDefault()})).appendTo($imageList).addClass(currentClass);
                imgsLen > 1 && $('<div>').appendTo($dotIndicator).addClass(currentClass);
            })
            $imageList.css('marginLeft', - currentIndex * 100 + '%');
            // 从触发事件的影像开始放大
            if ($target.length === 1) {
                var scrollTop = $(window).scrollTop(), top = $target.offset().top - scrollTop, 
                    left = $target.offset().left, width = parseInt($imageViewer.css('maxWidth')) || $(window).width();
                $imageViewer.show().css({
                    top: top,
                    left: left,
                    width: $target.width(),
                    height: $target.height(),
                    opacity: .5
                }).animate({
                    top: 0,
                    left: ($(window).width() - width) / 2,
                    width: width,
                    height: $(window).height(),
                    opacity: 1
                }, 500, function() {
                    $(this).css({
                        right: 0,
                        left: 0,
                        margin: 'auto',
                        width: '100%',
                        height: '100%'
                    })
                })
                $imageViewerBg.show();
                onOpen && onOpen($imageList.children('.current').index(), $.makeArray($imageList.find(selector)), $.makeArray($imageAll));
            }
    }
    /**
     * 关闭：close
     * @param {jQuery Object} $target 关闭时，查看器逐渐缩小到这个元素
     * @param {Function} [onClose] 当 ImageViewer 被关闭时触发
     */
    $.fn.yzhanImageViewer.close = function (opt) {
        var $target = opt.$target || [], onClose = opt.onClose
        if ($target.length >= 1) {
            var scrollTop = $(window).scrollTop(), top = $target.offset().top - scrollTop, left = $target.offset().left;
            $imageViewer.css({
                right: 'auto',
                left: $imageViewer.offset().left,
                margin: 0
            }).animate({
                top: top,
                left: left,
                width: $target.width(),
                height: $target.height(),
                opacity: .5,
            }, 500, function() {
                $imageViewer.hide();
            });
        } else {
            $imageViewer.fadeOut();
        }
        $imageViewerBg.hide();
        preventRollThrough(false);
        onClose && onClose($imageList.children('.current').index(), $.makeArray($imageList.find(selector)), $.makeArray($imageAll));
    }

    /**
     * 切换：change
     * @param {Integer} index 要跳转到第几张影像，从0开始
     * @param {Function} [onChange] 当影像切换时回调函数
     */
    $.fn.yzhanImageViewer.change = function (opt) {
        var index = opt.index,
            onChange = opt.onChange,
            $current = $imageList.children('.current'), currentIndex = $current.index(), len = $imageList.children().length;
            index = Math.max(0, Math.min(index, len - 1));
            $imageList.stop(true, true).animate({'marginLeft': - index * 100 + '%'}, 300);
            $imageList.children('div').eq(index).addClass('current').siblings().removeClass('current');
            $dotIndicator.children('div').eq(index).addClass('current').siblings().removeClass('current');
            if (index !== currentIndex) {
                scaleImg($current.children('img'), 1);
                index === 0 && $switchPrev.hide();
                index === len - 1 && $switchNext.hide();
                onChange && onChange($imageList.children('.current').index(), $current.index(), $.makeArray($imageList.find(selector)), $.makeArray($imageAll));
            }
    }
    
    /**
     * 获取鼠标指针或触摸位置的X或Y坐标
     * @param {c.Event} e jQuery 封装后的事件对象
     * @param {x|y} type 获取坐标名 
     */
    function getXY(e, type) {;
        var n = 'client' + type.toUpperCase();
        return  (e[n] || getTouchCenterPos(e.originalEvent.touches)[n] || 0) - $imageViewer.offset().left;
    }

    /**
     * 获取一组触摸点的中心位置点坐标
     * @param {Array} $touches 触摸点数组
     */
    function getTouchCenterPos($touches) {
        var pos = {clientX:0, clientY: 0}, len = $touches && $touches.length || 0;
        if (len > 0) {
            for (var i = 0; i < len; i++) {
                pos.clientX += $touches[i].clientX;
                pos.clientY += $touches[i].clientY;
            }
            pos.clientX = pos.clientX / len;
            pos.clientY = pos.clientY / len;
        }
        return pos;
    }
    
    /**
     * 缩放影像
     * @param {jQuey Object} $img 要设置的影像对象
     * @param {Integer} rate 缩放比率
     * @param {c.Event} [e] jQuery 封装后的事件对象
     * @param {Boolean} [addon] 是否开启叠加放缩方式，保留元素当前的缩放比例，在此基础上继续放缩
     */
    function scaleImg($img, rate, e, addon) {
        var scale = $img.data('scale') || 1;
        if (rate === 1) {
            $img.css({
                'transform': 'translateY(-50%)',
                'transform-origin': '',
                'top': '50%',
                'left': 0,
                'transition': '.3s all linear'
            }).data('scale', 1);
        } else {
            if (addon === true) {
                rate *= scale;
                rate = rate < 0.5 && 0.5 || rate > 3 && 3 || rate;
            }
            var topDiffer = $(window).height() - $img.height() * rate,
                leftDiffer = $imageViewer.width() - $img.width() * rate,
                x = getXY(e, 'x'), y = getXY(e, 'y');
                $debug.html('x:' + x + ' y:' + y);
                $img.css({
                    'top': topDiffer < 0 ? Math.max(Math.min(0, - (y - (e.pos && e.pos.top || 0)) * (rate - 1)), topDiffer) : topDiffer / 2,
                    'left': leftDiffer < 0 ? Math.max(Math.min(0, - (x - (e.pos && e.pos.left || 0)) * (rate - 1)), leftDiffer) : leftDiffer / 2,
                    'transform-origin': '0 0',
                    'transform': 'scale(' + rate + ')',
                    'transition': ''
                }).data('scale', rate);
        }
    }

    /**
     * 节流或防抖
     * @param {Function} fn 要节流的函数 
     * @param {Integer} wait 多少毫秒执行一次
     * @param {Boolean} debounce 是否开启防抖
     */
    function throttle(fn, wait, debounce) {
        var timer = null
        return function() {
            var _this = this, args = arguments;
            debounce && timer &&  (clearTimeout(timer) || (timer = null))
            !timer && (timer = setTimeout(function() {
                fn.apply(_this, args);
                timer = null;
            }, wait));
        }
    }

    /**
     * 防止滚动穿透：避免移动端上下移动时，文档区域跟随滚动
     * @param {Boolean} prevent 是否要阻止滚动穿透
     */
    function preventRollThrough(prevent) {
        if (prevent) {
            data.bodyOverflow = $('body').css('overflow');
            $('body').css('overflow', 'hidden');
        } else {
            $('body').css('overflow', data.bodyOverflow);
        }
    }
    $('body').append($imageViewerBg).append($imageViewer);
})(jQuery);