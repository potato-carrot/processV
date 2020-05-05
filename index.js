(function () {
    window.processV = {
        //设置参数数据
        options: null,

        //DOM的id
        el: "",

        //指向processV实例
        _this: undefined,

        //echarts实例
        echarts: undefined,

        //当前操作的data的id
        currentDataId: '',

        //流程图数据
        datas: [],

        //流程图连接线
        links: [],

        //拖拽图例时节流timer
        timer_drag: null,

        //临时保存被拖拽图例的颜色
        currentDragDataColor: "",

        //记录当前拖拽的工序靠近的links
        linksDataCloseTo: [],

        //添加链接线时拖拽小圆点生成的虚拟连接数据
        dataLink: [],

        //连线--添加链接线时拖拽小圆点生成的虚拟连接数据
        link_dataLink: [],

        //拖拽连接线图例时节流timer
        timer_dragLink: null,

        //初始化画布
        /**
        * @param {number,string} el 必选 所渲染的DOM的id属性值
        * @param {number,string} width 可选 DOM的宽度，单位px
        * @param {number,string} height 可选 DOM的高度，单位px
        * @param {Array} datas 可选 流程图数据
        * @param {Array} links 可选 流程图连接线数据
        * @return {Object} 返回值描述
        **/
        init({ el, canvas, datas, links }) {
            el = el + "";
            //初始化虚拟图例
            this.initVirtualGraph();
            this._this = this;
            let $el = document.getElementById(el);
            if (!$el) {
                //如果所传的DOM的id在页面中不存在，则返回
                return;
            } else {
                this.el = el;

                //获取相关DOM的宽高
                let domStyle = window.getComputedStyle($el, null);
                let canvasHeight = domStyle.height;
                let canvasWidth = domStyle.width;

                //实例化echarts
                this.echarts = echarts.init($el);

                //初始化echarts画布
                this.initEcharts(parseInt(canvasWidth), parseInt(canvasHeight), canvas.gridWidth, canvas.gridHeight);

                $(`#${el} div`).css({
                    'z-index': '1'
                })

                this.datas = datas;
                this.links = links;

                //渲染流程图
                this.renderProcess();

                //初始化参数
                this.options = {
                    el,
                    canvas,
                    datas,
                    links
                }
            }
        },

        //初始化虚拟图例
        initVirtualGraph() {
            //将虚拟图例DOM挂载到页面
            let $vdom = $(`<div id="graphModel"><div id="graphModel_label"></div><div id="graphModel_loc">500,500</div></div>`);
            $('body').append($vdom);

            //添加样式
            $('#graphModel').css({
                'display': 'none',
                'position': 'absolute',
                'box-shadow': '0 0 10px #82dffe',
                'background-size': '100%',
                'background-position': 'center',
                'background-repeat': 'no-repeat',
            })

            $('#graphModel_label').css({
                'border': '1px solid black',
                'overflow': 'hidden',
                'left': '50%',
                'top': '50%',
                'height': '33px',
                'border-radius': '6px',
                'transform': 'translate3d(-50%, -50%, 0)',
                'position': 'relative',
                'z-index': '1000',
                'background': '#fff',
                'font-size': '16px',
                'font-weight': '800',
                'text-align': 'center',
                'line-height': '33px',
                'text-shadow': ' 1px 1px black, -1px -1px black, 1px -1px black, -1px 1px black',
                'color': ' #fff',
            })

            $('#graphModel_loc').css({
                'position': 'absolute',
                'border': '1px solid black',
                'height': '30px',
                'width': '100px',
                'line-height': '30px',
                'font-size': '13px',
                'font-weight': '600',
                'background': 'rgba(0, 0, 0, 0.8)',
                'color': '#fff',
                'text-align': 'center',
                'border-radius': '5px',
                'z-index': '99999',
                'left': '50%',
                'bottom': '-40px',
                'transform': 'translate3d(-49%, 0, 0)',
            })
        },

        //获取用户自定义数据
        /**
        * @return {Object} 返回custom，即用户自定义数据对象
        **/
        getData() {
            return this.options;
        },

        //渲染echarts画布
        /**
        * @param {string,number} canvasWidth 必选 echarts画布的宽度，单位px
        * @param {string,number} canvasHeight 必选 echarts画布的高度，单位px
        * @param {string,number} gridWidth 可选 echarts画布的网格宽度，单位px
        * @param {string,number} gridHeight 可选 echarts画布的网格高度，单位px
        **/
        initEcharts(canvasWidth, canvasHeight, gridWidth, gridHeight) {
            //网格宽高参数校验，若参数无效，则默认为50px
            gridWidth = isNaN(parseInt(gridWidth)) ? 50 : parseInt(gridWidth);
            gridHeight = isNaN(parseInt(gridHeight)) ? 50 : parseInt(gridHeight);

            this.echarts.setOption({
                xAxis: {
                    min: 0,
                    max: canvasWidth,
                    position: "top",
                    type: "value",
                    splitNumber: Math.ceil(canvasWidth / gridWidth),
                    show: true,
                    axisLine: {
                        onZero: true,
                        lineStyle: {
                            color: "#DCDCDC"
                        }
                    },
                    axisLabel: { show: true },
                    axisTick: { show: true }
                },
                yAxis: {
                    min: 0,
                    max: canvasHeight,
                    inverse: true,
                    type: "value",
                    splitNumber: Math.ceil(canvasHeight / gridHeight),
                    show: true,
                    axisLine: {
                        onZero: false,
                        lineStyle: {
                            color: "#DCDCDC"
                        }
                    },
                    axisLabel: { show: true },
                    axisTick: { show: true },
                    color: "#DCDCDC"
                },
                grid: {
                    left: "0%",
                    right: "5%",
                    top: "1%",
                    containLabel: true
                },
                series: [],
                graphic: []
            });
        },

        //渲染流程图
        renderProcess() {
            let datasPosition = [];
            for (let i = 0; i < this.datas.length; i++) {
                datasPosition[i] = [this.datas[i].value[0], this.datas[i].value[1]];
            }
            this.echarts.setOption({
                series: [
                    {
                        id: "a",
                        type: "graph",
                        layout: "none",
                        coordinateSystem: "cartesian2d",
                        smooth: true,
                        data: this.datas,
                        edgeSymbol: ["circle", "arrow"],
                        edgeSymbolSize: [10, 35],
                        links: this.links,
                        lineStyle: {
                            normal: {
                                width: 8,
                                color: "rgba(30,144,255, .70)"
                            }
                        },
                        label: {
                            normal: {
                                position: "inside",
                                show: true,
                                formatter: params => {
                                    if (this.datas[params.dataIndex]) {
                                        return this.datas[params.dataIndex].label;
                                    }
                                    return "";
                                },
                                backgroundColor: "#eee",
                                borderColor: "#555",
                                borderWidth: 2,
                                borderRadius: 5,
                                padding: 8,
                                fontSize: 15,
                                textBorderColor: "#000",
                                textBorderWidth: 3,
                                color: "#fff"
                            }
                        },
                        itemStyle: {
                            normal: {
                                color: params => {
                                    if (this.datas[params.dataIndex]) {
                                        return this.datas[params.dataIndex].color;
                                    }
                                    return "#fff";
                                },
                                borderColor: "#1E90FF",
                                borderWidth: 2,
                                shadowBlur: 10,
                                shadowColor: "#82dffe"
                            }
                        }
                    }
                ],
                graphic: echarts.util.map(datasPosition, (item, index) => {
                    return {
                        id: "datasCircle" + index,
                        type: "circle",
                        position: this.echarts.convertToPixel("grid", item),
                        shape: {
                            r:
                                this.datas[index].symbolSize / 2 +
                                this.datas[index].symbolSize / 8
                        },
                        invisible: true,
                        draggable: true,
                        onmousedown: echarts.util.curry(this.handleMousedown, index, this),
                        onmouseup: echarts.util.curry(this.handleMouseup, index, this),
                        onmouseover: echarts.util.curry(this.handleMouseover, index, this),
                        ondrag: echarts.util.curry(this.handleDrag, index, this),
                        z: 100
                    };
                })
            });
        },

        //流程图操作--鼠标落下
        handleMousedown(index, _this) {
            _this.currentDataId = _this.datas[index].id;
            $("#graphModel").hide();
            _this.generateGraphModel(index);
        },

        //通过dom生成虚拟加工方法图例
        generateGraphModel(index) {
            //鼠标落在datas上时生成dom图例
            let x = this.datas[index].value[0];
            let y = this.datas[index].value[1];
            let symbol = this.datas[index].symbol;
            let symbolSize = this.datas[index].symbolSize;
            let color = this.datas[index].color;
            let label = this.datas[index].label;

            //graphModel_label的width跟随内部text长度变化而变化
            let label_length = label.length;
            //记录label中的中文字符
            let countCN = 0;
            //记录label中的英文字符
            let countEN = 0;
            for (let i = 0; i < label_length; i++) {
                if (label.charCodeAt(i) > 255) {
                    countCN += 2;
                } else {
                    countEN++;
                }
            }

            let totalText_length = (countCN + countEN) * 0.8 * 16 + "px";
            $("#graphModel_label").css("width", totalText_length);
            $("#graphModel_label").html(label);
            $("#graphModel_label").show();

            $("#graphModel").css({
                left: x + "px",
                top: y + "px",
                height: symbolSize + "px",
                width: symbolSize + "px"
            });

            //初始化虚拟图例形状
            $("#graphModel").css('border-radius', '0');
            $("#graphModel").css('clip-path', 'none');
            if (symbol == "rectangle") {
                //正方形
                $("#graphModel").css("background-color", color);
                $("#graphModel").css("background-image", "none");
            } else if (symbol == 'circle') {
                //圆形
                $("#graphModel").css('border-radius', '50%');
                $("#graphModel").css("background-color", color);
                $("#graphModel").css("background-image", "none");
            } else if (symbol == 'diamond') {
                //菱形
                $("#graphModel").css('clip-path','polygon(50% 0, 100% 50%, 50% 100%, 0 50%)');
                $("#graphModel").css("background-color", color);
                $("#graphModel").css("background-image", "none");
            } else {
                //使用背景图片
                //EX:symbol_path = 'image://./images/lathe.jpg'-->images/lathe.jpg
                let symbol_path = symbol.substring(8);
                $("#graphModel").css("background-image", "url(" + symbol_path + ")");
                $("#graphModel").css("background-color", "none");
            }
        },

        //流程图操作--鼠标拖动
        handleDrag(index, _this) {
            let newLoc = [];
            newLoc[index] = _this.echarts.convertFromPixel("grid", this.position);

            let x = newLoc[index][0];
            let y = newLoc[index][1];

            let dis = _this.utils.getDistance(
                _this.datas[index].value[0],
                _this.datas[index].value[1],
                x,
                y
            );

            //拖动距离非常小时，不需要显示graphModel
            if (dis > 10) {
                $("#graphModel").show();
            }

            $("#graphModel").css("left", x + "px");
            $("#graphModel").css("top", y + "px");
            $("#graphModel").css("transform", "translate3d(-50%,-50%,0)");
            $("#graphModel_loc").html(
                "X: " + Math.floor(x) + ", Y: " + Math.floor(y)
            );

            //临时保存被拖拽的图形的颜色
            if (_this.currentDragDataColor == "") {
                _this.currentDragDataColor = _this.datas[index].color;
            }

            if (_this.timer_drag) return;
            _this.timer_drag = setTimeout(() => {
                //计算拖拽的图形是否到达某两个连接线之间
                for (let i = 0; i < _this.links.length; i++) {
                    let id1 = _this.links[i].source;
                    let id2 = _this.links[i].target;

                    if (_this.datas[index].id == id1 || _this.datas[index].id == id2)
                        continue;

                    let data1 = _this.datas.find(item => {
                        return item.id == id1;
                    });
                    let x1 = data1.value[0];
                    let y1 = data1.value[1];

                    let data2 = _this.datas.find(item => {
                        return item.id == id2;
                    });
                    let x2 = data2.value[0];
                    let y2 = data2.value[1];

                    //计算被拖动图形的到直线的距离
                    let a = y1 - y2;
                    let b = x2 - x1;
                    let c = x1 * (y2 - y1) - y1 * (x2 - x1);

                    //图形中心到直线的距离
                    let d = Math.abs(a * x + b * y + c) / Math.sqrt(a * a + b * b);

                    //当距离直线小于50px时，图例变色
                    if (d < 50) {
                        let y_bg;
                        let x_bg;
                        let y_sm;
                        let x_sm;
                        if (y2 > y1) {
                            y_bg = y2;
                            y_sm = y1;
                        } else {
                            y_bg = y1;
                            y_sm = y2;
                        }

                        if (x2 > x1) {
                            x_bg = x2;
                            x_sm = x1;
                        } else {
                            x_bg = x1;
                            x_sm = x2;
                        }

                        if (y1 != y2) {
                            //如果两个图例y坐标不同
                            if (x1 != x2) {
                                //如果两个图例x坐标不同
                                if (y_bg > y && x_bg > x && y_sm < y && x_sm < x) {
                                    _this.addInLinksDataCloseTo(id1, id2);
                                }
                            } else {
                                if (y_bg > y && y_sm < y) {
                                    _this.addInLinksDataCloseTo(id1, id2);
                                }
                            }
                        } else {
                            if (x1 != x2) {
                                if (x_bg > x && x_sm < x) {
                                    _this.addInLinksDataCloseTo(id1, id2);
                                }
                            }
                        }
                    } else {
                        _this.linksDataCloseTo = _this.linksDataCloseTo.filter(item => {
                            return item.source != id1 || item.target != id2;
                        });
                    }

                }
                if (_this.linksDataCloseTo.length != 0) {
                    $("#graphModel").css("background-color", "red");
                } else {
                    $("#graphModel").css(
                        "background-color",
                        _this.currentDragDataColor
                    );
                    _this.currentDragDataColor = "";
                }
                _this.timer_drag = null;
            }, 100);
        },

        //向linksDataCloseTo中添加link
        addInLinksDataCloseTo(id1, id2) {
            let flag = true;
            for (let i = 0; i < this.linksDataCloseTo.length; i++) {
                if (
                    this.linksDataCloseTo[i].source == id1 &&
                    this.linksDataCloseTo[i].target == id2
                ) {
                    flag = false;
                }
            }
            if (flag) {
                this.linksDataCloseTo.push({
                    source: id1,
                    target: id2
                });
            }
        },

        //流程图操作--鼠标抬起
        handleMouseup(index, _this) {
            //更新datas坐标
            _this.datas[index].value = _this.utils.magnetLoc(
                _this.echarts.convertFromPixel("grid", this.position).slice(),
                100
            );

            let id = _this.datas[index].id;

            if (_this.linksDataCloseTo.length != 0) {
                //如果是在两个图形中加入新图形
                let link = _this.linksDataCloseTo[0];
                _this.linksDataCloseTo = [];
                let source = link.source;
                let target = link.target;

                //删除原links中的连接线
                _this.links = _this.links
                    .filter(item => {
                        return item.source != source || item.target != target;
                    })
                    .filter(item => {
                        return item.target != id;
                    })
                    .filter(item => {
                        return item.source != id;
                    });

                let newLink1 = {
                    source,
                    target: id
                };
                let newLink2 = {
                    source: id,
                    target
                };
                _this.links.push(newLink1, newLink2);

                //更新datas中data的位置
                let data = _this.datas[index];
                _this.datas.splice(index, 1);

                let insertIndex = _this.datas.findIndex(item => {
                    return item.id == source;
                });

                _this.datas.splice(insertIndex + 1, 0, data);

                _this.renderProcess();
            }

            _this.echarts.setOption({
                series: [
                    {
                        id: "a",
                        data: _this.datas,
                        links: _this.links
                    }
                ]
            });

            //同步dataLink坐标
            _this.dataLink[0].value[0] = _this.dataLink[1].value[0] =
                _this.datas[index].value[0];
            _this.dataLink[0].value[1] = _this.dataLink[1].value[1] =
                _this.datas[index].value[1] + _this.datas[index].symbolSize / 2;

            //获取dataLink的位置，以更新小球位置
            let dataLinkPosition = [];
            dataLinkPosition[0] = _this.dataLink[0].value;
            dataLinkPosition[1] = _this.dataLink[1].value;

            _this.echarts.setOption({
                series: [
                    {
                        id: "dataLink",
                        data: _this.dataLink
                    }
                ],
                graphic: echarts.util.map(
                    dataLinkPosition,
                    (item, dataIndex) => {
                        if (dataIndex == 1) {
                            return {
                                id: "circle_dataLink",
                                position: _this.echarts.convertToPixel("grid", item)
                            };
                        }
                    }
                )
            });

            $("#graphModel").hide();
        },

        //流程图操作--鼠标悬浮
        handleMouseover(index, _this) {
            //更新连接线起点data的id
            _this.currentOriginId = _this.datas[index].id;

            $("#graphModel").hide();
            //先清空dataLink
            _this.dataLink = [];
            _this.echarts.setOption({
                series: [
                    {
                        id: "dataLink",
                        data: _this.dataLink,
                        type: "graph",
                        layout: "none",
                        coordinateSystem: "cartesian2d",
                        smooth: true
                    }
                ]
            });

            let x = Number(_this.datas[index].value[0]);
            let y = Number(_this.datas[index].value[1]);
            let size = Number(_this.datas[index].symbolSize);

            //下中点1
            let dataLinkChild1 = {
                id: 'dataLink1',
                symbol: 'circle',
                symbolSize: 12,
                label: '',
                color: '#fff',
                value: [x, y + size / 2 + 5],
            }

            //下中点2
            let dataLinkChild2 = {
                id: 'dataLink2',
                symbol: 'circle',
                symbolSize: 12,
                label: '',
                color: '#fff',
                value: [x, y + size / 2 + 5],
            }

            _this.dataLink = _this.dataLink
                .concat(dataLinkChild1)
                .concat(dataLinkChild2);

            //先清空
            _this.link_dataLink = [];

            //获取dataLinking中的child的位置
            let data_p = [];
            for (let i = 0; i < _this.dataLink.length; i++) {
                data_p[i] = [];
                data_p[i][0] = _this.dataLink[i].value[0];
                data_p[i][1] = _this.dataLink[i].value[1];
            }

            _this.echarts.setOption({
                series: [
                    {
                        id: "dataLink",
                        data: _this.dataLink,
                        type: "graph",
                        layout: "none",
                        coordinateSystem: "cartesian2d",
                        smooth: true,
                        itemStyle: {
                            normal: {
                                color: parmas => {
                                    return _this.dataLink[parmas.dataIndex].color;
                                },
                                borderColor: "#3a9fe8",
                                borderWidth: 1
                            }
                        },
                        links: _this.link_dataLink,
                        animationDuration: 200
                    }
                ],
                graphic: echarts.util.map(data_p, (item, index) => {
                    if (index == 1) {
                        return {
                            id: "circle_dataLink",
                            type: "circle",
                            position: _this.echarts.convertToPixel("grid", item),
                            shape: {
                                r: 15
                            },
                            cursor: "move",
                            invisible: true,
                            draggable: true,
                            ondrag: echarts.util.curry(_this.handleDrag_dataLink, index, _this),
                            onmouseup: echarts.util.curry(
                                _this.handleMouseup_dataLink,
                                _this
                            ),
                            z: 103
                        };
                    }
                })
            });
        },

        //流程图操作--鼠标拖动--dataLink
        handleDrag_dataLink(index, _this) {
            let newLoc = [];
            newLoc[index] = _this.echarts.convertFromPixel("grid", this.position);
            if (!_this.dataLink[index]) return;
            _this.dataLink[index].value = [...newLoc[index]];

            _this.link_dataLink = [
                {
                    source: _this.dataLink[0].id,
                    target: _this.dataLink[1].id
                }
            ];

            _this.echarts.setOption({
                series: [
                    {
                        id: "dataLink",
                        data: _this.dataLink,
                        edgeSymbol: ["circle", "arrow"],
                        edgeSymbolSize: [10, 35],
                        links: _this.link_dataLink,
                        lineStyle: {
                            normal: {
                                width: 10,
                                color: "red"
                            }
                        }
                    }
                ]
            });

            //隐藏datasCircle
            let datasPosition = [];
            for (let i = 0; i < _this.datas.length; i++) {
                datasPosition[i] = [_this.datas[i].value[0], _this.datas[i].value[1]];
            }

            _this.echarts.setOption({
                series: [
                    {
                        id: "a",
                        data: _this.datas
                    }
                ],
                graphic: echarts.util.map(datasPosition, (item, index) => {
                    return {
                        id: "datasCircle" + index,
                        shape: {
                            r: 0
                        }
                    };
                })
            });
            if (_this.timer_dragLink) return;
            _this.timer_dragLink = setTimeout(() => {
                for (let i = 0; i < _this.datas.length; i++) {
                    let dis = _this.utils.getDistance(
                        _this.datas[i].value[0],
                        _this.datas[i].value[1],
                        _this.dataLink[index].value[0],
                        _this.dataLink[index].value[1]
                    );
                    if (dis < 30 && i !== _this.currentOriginId) {
                        _this.links = _this.links.concat([
                            {
                                source: _this.currentOriginId,
                                target: _this.datas[i].id
                            }
                        ]);

                        _this.echarts.setOption({
                            series: [
                                {
                                    id: "a",
                                    data: _this.datas,
                                    edgeSymbol: ["circle", "arrow"],
                                    edgeSymbolSize: [10, 35],
                                    links: _this.links,
                                    lineStyle: {
                                        normal: {
                                            width: 8,
                                            color: "rgba(30,144,255, .70)"
                                        }
                                    }
                                }
                            ]
                        });

                        _this.link_dataLink = [];
                        _this.echarts.setOption({
                            series: [
                                {
                                    id: "dataLink",
                                    data: _this.dataLink,
                                    links: _this.link_dataLink
                                }
                            ]
                        });
                        _this.hideDataLink();
                        break;
                    }
                }
                _this.timer_dragLink = null;
            }, 100);
        },

        //隐藏dataLink
        hideDataLink() {
            this.dataLink = [];
            this.echarts.setOption({
                series: [
                    {
                        id: "dataLink",
                        data: this.dataLink
                    }
                ]
            });
        },

        //流程图操作--鼠标抬起--dataLink
        handleMouseup_dataLink(_this) {
            let datasPosition = [];
            for (let i = 0; i < _this.datas.length; i++) {
                datasPosition[i] = [_this.datas[i].value[0], _this.datas[i].value[1]];
            }

            _this.echarts.setOption({
                series: [
                    {
                        id: "a",
                        data: _this.datas
                    }
                ],
                graphic: echarts.util.map(datasPosition, (item, index) => {
                    return {
                        id: "datasCircle" + index,
                        shape: {
                            r:
                                _this.datas[index].symbolSize / 2 +
                                _this.datas[index].symbolSize / 8
                        }
                    };
                })
            });
        },

        //删除图例
        deleteData(id) {
            //删除图例数据
            this.datas = this.datas.filter(item => item.id != id)
            //删除连接线数据
            this.links = this.links.filter(item => item.source != id && item.target != id);
            //删除可拖拽小球
            let chartOption = this.echarts.getOption();
            chartOption.graphic = [];
            this.echarts.setOption(chartOption, true);

            this.renderProcess();
        },

        //添加连接线
        addLinks(source, target) {
            this.links.push({
                source,
                target
            });
            this.resetLinks();
        },

        //删除连接线
        deleteLinks(id1, id2) {
            this.links = this.links.filter(item => {
                if (item.source == id1 && item.target == id2) {
                    return false;
                }
                if (item.source == id1 && item.target == id2) {
                    return false;
                }
                return true;
            });
            this.resetLinks();
        },

        //重置连接线
        resetLinks() {
            this.echarts.setOption({
                series: [
                    {
                        id: "a",
                        links: this.links
                    }
                ]
            });
        },

        //格式化流程图的位置
        formatDatasPosition() {
            //获取相关DOM的宽高
            let domStyle = window.getComputedStyle(document.getElementById(this.el), null);
            let width = domStyle.width;
            let lastPos = [100, 100];
            //图例生成的方向:0-向左;1-向右
            let direction = 1;

            //格式化datas
            for (let i = 0; i < this.datas.length; i++) {
                this.datas[i].value = (() => {
                    if (lastPos[0] >= width && direction == 1) {
                        direction = 0;
                        let y = lastPos[1];
                        lastPos[1] += 200;
                        return [lastPos[0], y];
                    } else if (lastPos[0] <= 100 && direction == 0) {
                        direction = 1;
                        let y = lastPos[1];
                        lastPos[1] += 200;
                        return [lastPos[0], y];
                    } else {
                        if (direction == 1) {
                            let x = lastPos[0];
                            lastPos[0] += 200;
                            return [x, lastPos[1]];
                        } else {
                            let x = lastPos[0];
                            lastPos[0] -= 200;
                            return [x, lastPos[1]];
                        }
                    }
                })();
            }

            let chartOption = this.echarts.getOption();
            chartOption.graphic = [];
            this.echarts.setOption(chartOption, true);

            this.hideDataLink();

            this.renderProcess();
        },

        //工具对象
        utils: {
            //计算两点间的距离
            getDistance(x1, y1, x2, y2) {
                return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)).toFixed(2);
            },
            //自动吸附到网格,适用于大小为150px或100px的图例
            magnetLoc(position, symbolSize) {
                let mouse_x = parseInt(position[0]);
                let mouse_y = parseInt(position[1]);
                let rest_x;
                let rest_y;
                let grid_width = 50;
                let grid_height = 50;

                rest_x = mouse_x % grid_width;
                rest_y = mouse_y % grid_height;

                if (symbolSize == 150) {
                    mouse_x -= rest_x;
                    mouse_y -= rest_y;
                    mouse_x += grid_width / 2;
                    mouse_y += grid_height / 2;
                }
                if (symbolSize == 100) {
                    if (rest_x < 25) {
                        mouse_x -= rest_x;
                    } else {
                        mouse_x = mouse_x + (50 - rest_x);
                    }

                    if (rest_y < 25) {
                        mouse_y -= rest_y;
                    } else {
                        mouse_y = mouse_y + (50 - rest_y);
                    }

                }
                position[0] = parseInt(mouse_x);
                position[1] = parseInt(mouse_y);

                return position;
            }
        }
    }
})()





