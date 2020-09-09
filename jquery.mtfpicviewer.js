(function ($) {
    var $picViewer = $('<div>').addClass('mtf-pic-viewer'),
        $picViewerBg = $('<div>').addClass('mtf-pic-viewer-bg'),
        $picList = $('<div>').addClass('mtf-pic-list').appendTo($picViewer),
        $dotIndicator = $('<div>').addClass('mtf-dot-indicator').appendTo($picViewer),
        $debug = $('<div>').addClass('mtf-debug').appendTo($picViewer),
        debug = false,
        imgsLen = 0,
        $container = null,
        maxWidth = 'none',
        selector = 'img',
        attrSelector = 'src'
        
    $.fn.extend({
        "mtfpicviewer": function (opt) {
            var parentSelector = opt.parentSelector;

                opt.selector && (selector = opt.selector);
                opt.attrSelector && (attrSelector = opt.attrSelector);
                $container = this;
                maxWidth = opt.maxWidth || 'none';
                debug = opt.debug;

                $container.on('click', selector, function() {
                    var $current = $(this), $parent = $container, imgUrls = [];
                    if (parentSelector) {
                        $parent = $current.parents(parentSelector);
                    }
                    $parent.find(selector).each(function(index, ele) {
                        imgUrls.push($(ele).attr(attrSelector));
                    });
                    $.fn.mtfpicviewer.zoome($current.attr(attrSelector), imgUrls);
                    return false;
                });

                var clickTimer = null;
                $picViewer.on('click', function() {
                    clearTimeout(clickTimer);
                    clickTimer = setTimeout(function() {
                        $.fn.mtfpicviewer.raw();
                    }, 250);
                });

                $picViewer.on('mousedown touchstart', function(e) {
                    var ts = e.originalEvent.touches, $img = $picList.children('.current').children('img'), isMove = false;
                        if (ts && ts.length === 2) {// 双指缩放
                            var distance = Math.sqrt(Math.pow(ts[1].clientX - ts[0].clientX, 2) + Math.pow(ts[1].clientY - ts[0].clientY, 2));
                                isMove = true, startE = e;
                                startE.pos = $img.position();
                        }
                        var marginLeft = parseFloat($picList.css('marginLeft').replace(/[^\d|\-|\.]+/g,'')), xDistance = 0, yDistance = 0,
                            imgWidth = $img.width() * ($img.data('scale') || 1), imgHeight = $img.height() * ($img.data('scale') || 1),
                            imgMinLeft = $container.width() - imgWidth, imgMinTop = $(window).height()  - imgHeight,
                            startPos = {x: getXY(e, 'x'), y: getXY(e, 'y')};
                   
                        $picViewer.on('mousemove touchmove', throttle(function(e) {
                            var ts = e.originalEvent.touches;
                            if (ts && ts.length === 2) {// 双指缩放
                                var newDistance = Math.sqrt(Math.pow(ts[1].clientX - ts[0].clientX, 2) + Math.pow(ts[1].clientY - ts[0].clientY, 2));   
                                distance && scaleImg($img, newDistance / distance, startE, true);
                            } else {
                                var imgPosLeft = $img.position().left, imgPosTop = $img.position().top,
                                    x = getXY(e, 'x'), y = getXY(e, 'y'), scale = $img.data('scale') || 1, isMoving = true;
                                    xDistance = x - startPos.x, yDistance = y - startPos.y;
                                    if (xDistance || yDistance) {
                                        if (scale > 1) {
                                            if (yDistance < 0 && imgPosTop < 0) {
                                                $img.css('top', Math.min(imgPosTop - yDistance * scale, 0) + 'px');
                                            } else if (yDistance > 0 && imgPosTop > imgMinTop) {
                                                $img.css('top', Math.max(imgPosTop - yDistance * scale, imgMinTop) + 'px');
                                            }
                                            if (xDistance < 0 && imgPosLeft < 0) {
                                                $img.css('left', Math.min(imgPosLeft - xDistance * scale * 2, 0) + 'px');
                                            } else if (xDistance > 0 && imgPosLeft > imgMinLeft + 1) {
                                                $img.css('left', Math.max(imgPosLeft - xDistance * scale * 2, imgMinLeft) + 'px');
                                            } else {
                                                isMoving = false;
                                            }
                                        } else {  
                                            isMoving = false;
                                        }
                                        if (isMoving) {
                                            startPos.x = x;
                                            startPos.y = y;
                                        } else {
                                            $picList.css('marginLeft', marginLeft - xDistance + 'px');
                                        }
                                        isMove = true;
                                    }
                            }
                        }, 36));
                        $(window).on('mouseup touchend', function() {
                            var index = Math.round(- parseInt($picList.css('marginLeft')) / $picList.width() + (xDistance < 0 && -.35 || xDistance > 0 && .25 || 0));
                            if(isMove) {
                                setTimeout(function() {
                                    clearTimeout(clickTimer);
                                    if ($img.data('scale') <= 1) {
                                        scaleImg($img, 1);
                                    }
                                }, 36);
                            }
                            $.fn.mtfpicviewer.go(index);
                            $picViewer.off('mousemove touchmove');
                            $(window).off('mouseup touchend');
                        }); 
                });
                $picList.on('dblclick', 'div', function(e) {
                    var $img = $(this).children('img');
                        scaleImg($img, $img.data('scale') === 2 ? 1 : 2, e);
                        clearTimeout(clickTimer);
                });
        }
    });
    /**
     * 放大：zoome
     * @param {String} currentImgUrl 当前图片地址
     * @param {Array} imgUrls 所有图片地址数组
     */
    $.fn.mtfpicviewer.zoome = function (currentImgUrl, imgUrls) {
        var currentIndex = 0, currentClass, $target = $(window.event.target);
            imgsLen = imgUrls.length;

        $picList.empty();
        $dotIndicator.empty();

        $.each(imgUrls, function(index, imgUrl) {
          if (currentImgUrl === imgUrl) {
            currentIndex = index;
            currentClass = 'current';
          } else {
            currentClass = '';
          }
          $('<div>').append($('<img>').attr('src', imgUrl).mousedown(function(e){e.preventDefault()})).appendTo($picList).addClass(currentClass);
          imgsLen > 1 && $('<div>').appendTo($dotIndicator).addClass(currentClass).click(function() {
            $.fn.mtfpicviewer.go(index);
            return false;
          });
        })
        $picList.css('marginLeft', - currentIndex * 100 + '%');
        // 从触发事件的图片开始放大
        if ($target.length === 1 && $target[0].tagName === 'IMG') {
          var scrollTop = $(window).scrollTop(), top = $target.offset().top - scrollTop, left = $target.offset().left;
          $picViewer.show().css({
            top: top,
            left: left,
            width: $target.width(),
            height: $target.height(),
            opacity: .5,
            maxWidth: maxWidth
          }).animate({
            top: 0,
            left: $container.offset().left,
            width: $container.width(),
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
          $picViewerBg.show();
        }
    }
    /**
     * 还原：raw
     */
    $.fn.mtfpicviewer.raw = function () {
        var $target = $container.find(selector + '[' + attrSelector + '="' + $picList.children('.current').children('img').attr('src') + '"]');
        if ($target.length === 1) {
            var scrollTop = $(window).scrollTop(), top = $target.offset().top - scrollTop, left = $target.offset().left;
                $picViewer.css({
                    right: 'auto',
                    left: $container.offset().left,
                    margin: 0
                }).animate({
                    top: top,
                    left: left,
                    width: $target.width(),
                    height: $target.height(),
                    opacity: .5,
                }, 500, function() {
                    $picViewer.hide();
                    $picViewerBg.hide();
                });
        }
    }

    /**
     * 切换：go
     * @param {Integer} index 当前图片地址
     */
    $.fn.mtfpicviewer.go = function (index) {
        var $current = $picList.children('.current'), currentIndex = $current.index();
        index = Math.max(0, Math.min(index, imgsLen - 1));
        $picList.stop(true, true).animate({'marginLeft': - index * 100 + '%'}, 300);
        $picList.children('div').eq(index).addClass('current').siblings().removeClass('current');
        $dotIndicator.children('div').eq(index).addClass('current').siblings().removeClass('current');
        if (index !== currentIndex) {
            scaleImg($current.children('img'), 1);
        }
    }
    
    /**
     * 获取鼠标指针或触摸位置的X或Y坐标
     * @param {c.Event} e Jquery封装后的事件对象
     * @param {x|y} type 获取坐标名 
     */
    function getXY(e, type) {;
        n = 'client' + type.toUpperCase();
        return  (e[n] || getTouchCenterPos(e.originalEvent.touches)[n] || 0) - $picViewer.offset().left;
    }

    /**
     * 获取一组触摸点的中心位置点坐标
     * @param {Array} $touches 触摸点数组
     */
    function getTouchCenterPos($touches) {
        var pos = {clientX:0, clientY: 0};
        for (var i = 0, len = $touches.length; i < len; i++) {
            pos.clientX += $touches[0].clientX;
            pos.clientY += $touches[0].clientY;
        }
        pos.clientX = pos.clientX / len;
        pos.clientY = pos.clientY / len;
        return pos;
    }
    
     /**
     * 缩放图片
     * @param {Jquey Object} $img 要设置的图片对象
     * @param {Integer} rate 缩放比率
     * @param {c.Event} e Jquery封装后的事件对象
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
                rate = rate < 0.5 && 0.5 || rate > 5 && 5 || rate;
            }
            var topDiffer = $(window).height() - $img.height() * rate,
                leftDiffer = $container.width() - $img.width() * rate;

                debug && $debug.html('x:' + getXY(e, 'x') + ' y:' + getXY(e, 'y'));

                $img.css({
                    'top': topDiffer < 0 ? Math.max(Math.min(0, - (getXY(e, 'y') - (e.pos && e.pos.top || 0)) * (rate - 1)), topDiffer) : topDiffer / 2,
                    'left': leftDiffer < 0 ? Math.max(Math.min(0, - (getXY(e, 'x') - (e.pos && e.pos.left || 0)) * (rate - 1)), leftDiffer) : leftDiffer / 2,
                    'transform-origin': '0 0',
                    'transform': 'scale(' + rate + ')',
                    'transition': ''
                }).data('scale', rate);
        }
    }

    /**
     * 节流
     * @param {Function} fn 要节流的函数 
     * @param {Integer} wait 多少毫秒执行一次
     */
    function throttle(fn, wait) {
        var timer = null
        return function() {
            var _this = this, args = arguments;
            !timer && (timer = setTimeout(function() {
                fn.apply(_this, args);
                timer = null;
            }, wait));
        }
    }
    $('body').append($picViewerBg).append($picViewer);
})(jQuery);