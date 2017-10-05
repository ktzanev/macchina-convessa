var vm = new Vue({
  el: "#app",
  data: {
    aPolygon : [],  // the polygon like [ {cx : 0, cy :0, selected : false}, ...]
    dPolygon : [], // and it's dual
    aIsMaster : true, // decide the master / slave relation between A and D
    graphSize : 11,
    vertexSize : .05,
    edgeWidth : .035,
    integerPointSize : .049,
    precision : 4,
    examples : [
      { title: "Convex Asymetric 3/2", data: "(0,1)(1,0)(-1,-1)" },
      { title: "Convex Symetric 2 = B¹", data: "(1,0)(0,1)(-1,0)(0,-1)" },
      { title: "Star Symetric 3/2 A", data: "(0.5,0)(0.5,0.5)(0,0.5)(-1,1)(-0.5,0)(-0.5,-0.5)(0,-0.5)(1,-1)" },
      { title: "Star Symetric 3/2 B", data: "(0.5,0)(1,0.5)(0,0.5)(-0.5,1)(-0.5,0)(-1,-0.5)(0,-0.5)(0.5,-1)" },
      { title: "Star Symetric 4/3 A", data: "(1,0.3333333333333333)(0.3333333333333333,0.3333333333333333)(-0.3333333333333333,1)(-0.3333333333333333,0.3333333333333333)(-1,-0.3333333333333333)(-0.3333333333333333,-0.3333333333333333)(0.3333333333333333,-1)(0.3333333333333333,-0.3333333333333333)" },
      { title: "Star Symetric 4/3 B", data: "(-0.3333333333333333,0)(-1,-0.6666666666666666)(-0.3333333333333333,-0.6666666666666666)(-0.3333333333333333,-1.3333333333333333)(0.3333333333333333,0)(1,0.6666666666666666)(0.3333333333333333,0.6666666666666666)(0.3333333333333333,1.3333333333333333)" }
    ],
    useCtrl : navigator.userAgent.indexOf('Mac OS X') == -1
  },// end data
  // ------------------
  watch: {
    aPolygon : {
      handler : function (newA) {
        if (this.aIsMaster)
          this.dPolygon = this.dualPolygon(this.aLines);
      },
      deep : true
    },
    dPolygon : {
      handler : function (newD) {
        if (!this.aIsMaster)
          this.aPolygon = this.dualPolygon(this.dLines);
      },
      deep : true
    }
  },
  computed: {
    volumeAPolygon : function () {
      return this.volumePolygon(this.aPolygon);
    },
    volumeDPolygon : function () {
      return this.volumePolygon(this.dPolygon);
    },
    roundedAPolygon : function () {
      return this.roundedPolygon(this.aPolygon);
    },
    roundedDPolygon : function () {
      return this.roundedPolygon(this.dPolygon);
    },
    aLines: function () {
      return this.edgesOfPolygon(this.aPolygon);
    }, // end aLines()
    dLines: function () {
      return this.edgesOfPolygon(this.dPolygon);
    }, // end dLines
    dTriangles: function () {
      return this.trianglesOfPolygon(this.dPolygon);
    }, // end dTriangles
    graphPos: function graphPos() {
      var size = this.graphSize;
      var half = size / 2;
      return {
        viewBox: [-half, -half, size, size].join(" "),
        width: size
      };
    },
    aPolygonString: {
      // getter
      get: function () {
        var str = this.aPolygon.map(function(v){return "("+v.cx+","+v.cy+")";}).join('');
        try {
          localStorage.setItem("polygone", str);
        } catch(e) {
          console.log('Can\'t save to Local Storage :(');
        }
        return str;
      },
      // setter
      set: function (str) {
        this.aIsMaster = true;
        this.aPolygon = str.trim().replace(/^[( ]+|[ )]+$/g,"").split(/[^-0-9.,]+/).map(function(v){w = v.trim().split(/[^-0-9.]+/); return {cx:parseFloat(w[0]),cy:parseFloat(w[1]),selected:false};});
        try {
          localStorage.setItem("polygone", str);
        } catch(e) {
          console.log('Can\'t save to Local Storage :(');
        }
      }
    }
  }, // end computed
  created: function () {
    try {
      this.aPolygonString = localStorage.getItem("polygone", "(0,1)(1,0)(-1,-1)(-2,-1)");
    } catch(e) {
      this.aPolygonString = "(0,1)(1,0)(-1,-1)(-2,-1)";
    }
  }, // end created
  // ------------------
  methods: {
    // ------------------
    // Dual methods
    // ------------------
    dualPointFromSegment: function(s) {
      var d=s.x1*s.y2-s.y1*s.x2;
      return d ? { cx : (s.y2-s.y1)/d, cy : (s.x1-s.x2)/d} : null;
    },
    dualPolygon : function (line) {
      var n = line.length; // number of segments
      var dual = []; // the dual polygone will be stored inside
      var dp; // temp dual point

      for (var i = 0; i < n; i++) {
        dp = this.dualPointFromSegment(line[i]);
        if (!dp) return [];
        dp["selected"] = false;
        dual.push(dp);
      }

      return dual;
    },
    // ------------------
    // Accessories
    // ------------------
    edgesOfPolygon : function (poly){
      var n = poly.length; // number of points
      var edges = new Array(); // will contain all the edges like {x1,y1,x2,y2}

      for (var i = 0, j = 1; i < n; j = (++i+1) % n) {
        edges.push({
          x1 : poly[i].cx,
          y1 : poly[i].cy,
          x2 : poly[j].cx,
          y2 : poly[j].cy
        });
      }

      return edges;
    }, // end edgesOfPolygon
    trianglesOfPolygon : function (poly){
      var n = poly.length; // number of points
      var edges = new Array(); // will contain all the triangle like "0,0 x1,y1 x2,y2"

      for (var i = 0, j = 1; i < n; j = (++i+1) % n) {
        edges.push("0,0 " + poly[i].cx+","+poly[i].cy + " " + poly[j].cx+","+poly[j].cy);
      }

      return edges;
    }, // end trianglesOfPolygon
    roundPolygon : function (useA){
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      var n = xPolygon.length; // number of points

      this.aIsMaster = useA;

      for (var i = 0; i < n; i++) {
        xPolygon[i].cx = Math.round(xPolygon[i].cx*this.precision)/this.precision;
        xPolygon[i].cy = Math.round(xPolygon[i].cy*this.precision)/this.precision;
      }
    }, // end roundedPolygon
    volumePolygon : function (poly){
      var n = poly.length; // number of points
      var v = 0;

      for (var i = 0, j = 1; i < n; j = (++i+1) % n) {
        v += poly[i].cx * poly[j].cy - poly[j].cx * poly[i].cy;
      }

      return Math.abs(v/2);
    }, // end volumeOfPolygon()
    // ------------------
    addPoint: function addPoint(evt, i, useA) {
      if(!evt.shiftKey)
        return;

      var getPos = getMousePos;
      var svg = evt.currentTarget.closest("svg");
      var point = svg.createSVGPoint();
      var transform = svg.getScreenCTM().inverse();
      var xPolygon = useA ? this.aPolygon : this.dPolygon;

      this.aIsMaster = useA;

      getPos(evt, point);
      var newPt = point.matrixTransform(transform);
      xPolygon.splice((i+1) % xPolygon.length, 0, {
          cx: newPt.x,
          cy: newPt.y,
          selected : false
        });
    }, // end addPoint
    // ------------------
    startMove: function startMove(evt, vertex, useA) {
      var touch = evt.type === "touchstart";
      if (!touch && evt.button !== 0) return;
      var events = touch ? {
        move: "touchmove",
        stop: "touchend"
      } : {
        move: "mousemove",
        stop: "mouseup"
      };
      var getPos = touch ? getTouchPos : getMousePos;
      var svg = evt.currentTarget.closest("svg");
      var point = svg.createSVGPoint();
      var transform = svg.getScreenCTM().inverse();
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      var wasSelected = vertex.selected;
      vertex.selected = true;

      this.aIsMaster = useA;

      var moving = true;
      var newPt, oldPt;
      getPos(evt, point);
      oldPt = point.matrixTransform(transform);


      var updateFn = function updateFn() {
        if (moving) requestAnimationFrame(updateFn);

        // Map the screen pixels back to svg coords
        newPt = point.matrixTransform(transform);
        var dx = newPt.x - oldPt.x;
        var dy = newPt.y - oldPt.y;
        oldPt = newPt;
        for (var i = 0; i < xPolygon.length; i++)
          if (xPolygon[i].selected) {
            xPolygon[i].cx += dx;
            xPolygon[i].cy += dy;
          };
      };
      var moveFn = function moveFn(evt) {
        return getPos(evt, point);
      };
      var stopFn = function stopFn(evt) {
        moving = false;
        if( vm.useCtrl ? event.ctrlKey : evt.metaKey )
        {
          vertex.selected = !wasSelected;
        } else {
          vertex.selected = wasSelected;
        };
        svg.removeEventListener(events.move, moveFn);
        svg.removeEventListener(events.stop, stopFn);
      };

      requestAnimationFrame(updateFn);
      moveFn(evt);

      svg.addEventListener(events.move, moveFn);
      svg.addEventListener(events.stop, stopFn);
    }, // end startMove
    isInside : function isInside(m,n) {
      for(var i=0; i < this.dLines.length; i++) {
        // console.log(this.dLines[i]);
        if ( InsideSegmentStar(m,n,this.dLines[i].x1,this.dLines[i].y1,this.dLines[i].x2,this.dLines[i].y2) ) {
          console.log(m,n);
          return true;
        }
      }
      return false;
    }
  } // end methods
});

function InsideSegmentStar(m,n,x1,y1,x2,y2) {
  var delta = x1*y2-x2*y1;
  if (!delta) return false;

  var l1 = (y2*m-x2*n)/delta;
  if (l1 <= 0) return false;

  var l2 = (x1*n-y1*m)/delta;
  if (l2 <= 0) return false;

  return (l1+l2 < 1);
}

function getMousePos(mouseEvent, point) {
  point.x = mouseEvent.clientX;
  point.y = mouseEvent.clientY;
}

function getTouchPos(touchEvent, point) {
  point.x = touchEvent.touches[0].clientX;
  point.y = touchEvent.touches[0].clientY;
}
