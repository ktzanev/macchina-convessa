var vm = new Vue({
  el: "#app",
  data: {
    aPolygon : [],  // the polygon like [ {cx : 0, cy :0, selected : false}, ...]
    dPolygon : [], // and it's dual
    aIsMaster : true, // decide the master / slave relation between A and D
    graphSize : 7,
    vertexSize : .05,
    edgeWidth : .035,
    integerPointSize : .049,
    aPrecision : 4,
    dPrecision : 4,
    examples : [
      { title: "Convex Asymetric 3/2",   aim: true,  data: "(0,1)(1,0)(-1,-1)" },
      { title: "Convex Symetric 2 = B¹", aim: true,  data: "(1,0)(0,1)(-1,0)(0,-1)" },
      { title: "Star Symetric 3/2 A",    aim: true,  data: "(0.5,0)(0.5,0.5)(0,0.5)(-1,1)(-0.5,0)(-0.5,-0.5)(0,-0.5)(1,-1)" },
      { title: "Star Symetric 3/2 B",    aim: true,  data: "(0.5,0)(1,0.5)(0,0.5)(-0.5,1)(-0.5,0)(-1,-0.5)(0,-0.5)(0.5,-1)" },
      { title: "Star Symetric 4/3 A",   aim: false, data: "(0,3)(1.5,1.5)(-3,0)(-1.5,1.5)(0,-3)(-1.5,-1.5)(3,0)(1.5,-1.5)" },
      { title: "Star Symetric 4/3 B",    aim: false, data: "(-3,1.5)(-3,3)(0,-1.5)(-3,0)(3,-1.5)(3,-3)(0,1.5)(3,0)" }
    ],
    selectedExample : {},
    intervalID: null, // setInterval ID
    useCtrl : navigator.userAgent.indexOf('Mac OS X') == -1
  },// end data
  // ------------------
  watch: {
    aPolygon : {
      handler : function (newA) {
        var temp;
        if (this.aIsMaster) {
          temp = this.dualPolygon(this.aLines);
          temp.unshift(temp.pop()); // rotate
          this.dPolygon = temp;
        }
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
    centroidAPolygon : function () {
      return this.centroidPolygon(this.aPolygon);
    },
    centroidDPolygon : function () {
      return this.centroidPolygon(this.dPolygon);
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
    netSize: function netSize() {
      return 2*Math.floor(this.graphSize/2) + 3;
    },
    netOrigin: function netSize() {
      return Math.floor(this.graphSize/2) + 1;
    },
    aPolygonString: {
      // getter
      get: function () {
        var str = this.aPolygon.map(function(v){return "("+v.cx+","+v.cy+")";}).join('');
        if (this.aIsMaster) {
          try {
            localStorage.setItem("dPolygoneStr", str);
            localStorage.setItem("aIsMaster", this.aIsMaster);
          } catch(e) {
            console.log('Can\'t save A to Local Storage :(');
          }
        }
        return str;
      },
      // setter
      set: function (str) {
        this.aIsMaster = true;
        this.aPolygon = str.trim().replace(/^[( ]+|[ )]+$/g,"").split(/[^-0-9.,]+/).map(function(v){w = v.trim().split(/[^-0-9.]+/); return {cx:parseFloat(w[0]),cy:parseFloat(w[1]),selected:false};});
        try {
          localStorage.setItem("aPolygoneStr", str);
          localStorage.setItem("aIsMaster", this.aIsMaster);
        } catch(e) {
          console.log('Can\'t save A to Local Storage :(');
        }
      }
    },
    dPolygonString: {
      // getter
      get: function () {
        var str = this.dPolygon.map(function(v){return "("+v.cx+","+v.cy+")";}).join('');
        if (! this.aIsMaster) {
          try {
            localStorage.setItem("dPolygoneStr", str);
            localStorage.setItem("aIsMaster", this.aIsMaster);
          } catch(e) {
            console.log('Can\'t save D to Local Storage :(');
          }
        }
        return str;
      },
      // setter
      set: function (str) {
        this.aIsMaster = false;
        this.dPolygon = str.trim().replace(/^[( ]+|[ )]+$/g,"").split(/[^-0-9.,]+/).map(function(v){w = v.trim().split(/[^-0-9.]+/); return {cx:parseFloat(w[0]),cy:parseFloat(w[1]),selected:false};});
        try {
          localStorage.setItem("dPolygoneStr", str);
          localStorage.setItem("aIsMaster", this.aIsMaster);
        } catch(e) {
          console.log('Can\'t save D to Local Storage :(');
        }
      }
    },
    // second Minkovski for A
    z2APolygon: function(){
      return this.z2Polygon(this.aPolygon);
    },
    // second Minkovski for D
    z2DPolygon: function(){
      return this.z2Polygon(this.dPolygon);
    },
    // second matrix factor of the Hessian
    h2: function(){
      var z2DA = z2prod(this.z2DPolygon,this.z2APolygon);
      var vAD = this.volumeAPolygon*this.volumeDPolygon;
      return {
        x11: 1 - 16*z2DA.x11/vAD,
        x12: 0 - 16*z2DA.x12/vAD,
        x21: 0 - 16*z2DA.x21/vAD,
        x22: 1 - 16*z2DA.x22/vAD,
      };
    },
    hessian: function(){
      return kxz2xMatrix(-12*this.volumeDPolygon,this.z2APolygon,this.h2);
    }
  }, // end computed
  created: function () {
    try {
      this.aIsMaster = JSON.parse(localStorage.getItem("aIsMaster", "true"));
      if (this.aIsMaster)
        this.aPolygonString = localStorage.getItem("aPolygoneStr", "(0,1)(1,0)(-1,-1)(-2,-1)");
      else
        this.dPolygonString = localStorage.getItem("dPolygoneStr", "(0,1)(1,0)(-1,-1)(-2,-1)");
    } catch(e) {
      this.aIsMaster = true;
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
      var precision = useA ? this.aPrecision : this.dPrecision;
      var n = xPolygon.length; // number of points

      this.aIsMaster = useA;

      for (var i = 0; i < n; i++) {
        xPolygon[i].cx = Math.round(xPolygon[i].cx*precision)/precision;
        xPolygon[i].cy = Math.round(xPolygon[i].cy*precision)/precision;
      }
    }, // end roundPolygon
    skew : function (useA, direction){
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      var n = xPolygon.length; // number of points

      this.aIsMaster = useA;

      for (var i = 0; i < n; i++) {
        switch(direction) {
          case 1:
            xPolygon[i].cx += -xPolygon[i].cy;
            break;
          case 2:
            xPolygon[i].cx += xPolygon[i].cy;
            break;
          case 3:
            xPolygon[i].cy += xPolygon[i].cx;
            break;
          case 4:
            xPolygon[i].cy += -xPolygon[i].cx;
            break;
        }
      }
    }, // end skew
    center: function (useA) {
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      var centroidXPolygon = useA ? this.centroidAPolygon : this.centroidDPolygon;
      var n = xPolygon.length; // number of points

      this.aIsMaster = useA;

      for (var i = 0; i < n; i++) {
        xPolygon[i].cx += -centroidXPolygon.cx;
        xPolygon[i].cy += -centroidXPolygon.cy;
      }
    }, // end center
    startPingPong: function (){
      var ad = true;
      vm.intervalID = setInterval(function () {
        vm.center(ad);
        ad = !ad;
      }, 100);
    },
    stopPingPong: function (){
      window.clearInterval(vm.intervalID);
      vm.intervalID = null;
    },
    volumePolygon : function (poly){
      var n = poly.length; // number of points
      var v = 0;

      for (var i = 0, j = 1; i < n; j = (++i+1) % n) {
        v += determinant(poly[i],poly[j]);
      }

      return Math.abs(v/2);
    }, // end volumeOfPolygon
    centroidPolygon : function (poly){
      var n = poly.length; // number of points
      var d; // temporary determinant
      var a = 0; // the total area
      var x = 0, y = 0; // (x,y) will be the centroid

      for (var i = 0, j = 1; i < n; j = (++i+1) % n) {
        d = Math.abs(determinant(poly[i],poly[j]));
        a += d;
        x += (poly[i].cx+poly[j].cx)*d;
        y += (poly[i].cy+poly[j].cy)*d;
      }

      return {cx : x/3/a, cy : y/3/a};
    }, // end centroidPolygon
    z2Polygon : function (poly){
      var n = poly.length; // number of points
      var d; // temporary determinant
      var z2x2 = 0, z2y2 = 0, z2xy=0; // the ZxZ will be [x2 xy; xy y2]

      for (var i = 0, j = 1; i < n; j = (++i+1) % n) {
        d = Math.abs(determinant(poly[i],poly[j]));
        z2x2 += d*x2(poly[i],poly[j]);
        z2y2 += d*y2(poly[i],poly[j]);
        z2xy += d*xy(poly[i],poly[j]);
      }

      return {x2 : z2x2/12, y2 : z2y2/12, xy : z2xy/12};
    }, // end hessianPolygon
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
          return true;
        }
      }
      return false;
    },
    setExample: function setExample() {
      if (!this.selectedExample)
        return;
      this.aIsMaster = this.selectedExample.aim;
      if (this.aIsMaster)
        this.aPolygonString = this.selectedExample.data;
      else
        this.dPolygonString = this.selectedExample.data;
      // reset
      Vue.nextTick(function () {
        vm.selectedExample = {};
      });
    }
  } // end methods
});

// check if the point (m,n) is inside the traingle {(0,0) (x1,y1) (x2,y2)}
function InsideSegmentStar(m,n,x1,y1,x2,y2) {
  var delta = x1*y2-x2*y1;
  if (!delta) return false;

  var l1 = (y2*m-x2*n)/delta;
  if (l1 <= 0) return false;

  var l2 = (x1*n-y1*m)/delta;
  if (l2 <= 0) return false;

  return (l1+l2 < 1);
}

// calculate the determinant of p and q
function determinant(p,q) {
  return p.cx*q.cy-p.cy*q.cx;
}
// functions to calculate the Hessian
function x2(p,q) {
  return p.cx*p.cx+p.cx*q.cx+q.cx*q.cx;
}
function y2(p,q) {
  return p.cy*p.cy+p.cy*q.cy+q.cy*q.cy;
}
function xy(p,q) {
  return p.cx*p.cy+(p.cx*q.cy+q.cx*p.cy)/2+q.cx*q.cy;
}
function z2prod(a,b){
  return {
    x11: a.x2*b.x2+a.xy*b.xy,
    x12: a.x2*b.xy+a.xy*b.y2,
    x21: a.xy*b.x2+a.y2*b.xy,
    x22: a.xy*b.xy+a.y2*b.y2
  }
}
function kxz2xMatrix(k,z,m){
  return {
    x11: k*(z.x2*m.x11 + z.xy*m.x21),
    x12: k*(z.x2*m.x12 + z.xy*m.x22),
    x21: k*(z.xy*m.x11 + z.y2*m.x21),
    x22: k*(z.xy*m.x12 + z.y2*m.x22)
  }
}

function getMousePos(mouseEvent, point) {
  point.x = mouseEvent.clientX;
  point.y = mouseEvent.clientY;
}

function getTouchPos(touchEvent, point) {
  point.x = touchEvent.touches[0].clientX;
  point.y = touchEvent.touches[0].clientY;
}
