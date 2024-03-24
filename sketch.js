function scaleCanvas(canvas, context, width, height) {
    // source: https://gist.github.com/callumlocke/cc258a193839691f60dd

    // assume the device pixel ratio is 1 if the browser doesn't specify it
    const devicePixelRatio = window.devicePixelRatio || 1;
    const ratio = devicePixelRatio;

    if (devicePixelRatio !== 1) {
        // set the 'real' canvas size to the higher width/height
        canvas.width = width * ratio;
        canvas.height = height * ratio;

        // ...then scale it back down with CSS
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
    }
    else {
        // this is a normal 1:1 device; just scale it simply
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = '';
        canvas.style.height = '';
    }

    // scale the drawing context so everything will work at the higher ratio
    context.scale(ratio, ratio);
}


var sleepSetTimeout_ctrl;
function sleep(ms) {
    clearInterval(sleepSetTimeout_ctrl);
    return new Promise(resolve => sleepSetTimeout_ctrl = setTimeout(resolve, ms));
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Shift {
    constructor(angle, parent_angle) {
        this.angle = angle;
        this.parent_angle = parent_angle;
    }

    draw(center, radius, parent_radius) {
        var point = this.polar_to_cartesian(radius, this.angle, center);
        var parent = this.polar_to_cartesian(parent_radius, this.parent_angle, center);
        return [point, parent];
        // ctx.moveTo(point.x, point.y);
        // ctx.lineTo(parent.x, parent.y);
    }

    polar_to_cartesian(r, theta, center) {
        var x = center.x + r * Math.cos(theta);
        var y = center.y + r * Math.sin(theta);
        return new Point(x, y);
    }
}

class Rings {
    constructor(rings, radii, center) {
        // rings are lists of shifts
        this.rings = rings;
        this.radii = radii;
        this.center = center;
    }

    draw() {
        // ctx.beginPath();
        var lines = [];
        for (var i = 0; i < this.rings.length; i++) {
            var ring = this.rings[i];
            for (var j = 0; j < ring.length; j++) {
                var line = ring[j].draw(this.center, this.radii[i], this.radii[i+1]);
                lines.push(line);
            }
        }
        return lines;
        // ctx.stroke();
    }

    update() {
        var curr_angles = this.rings[0].map(shift => shift.angle);
        var next_angles = make_next_angles(curr_angles);
        // var next_angles = curr_angles.map(num => (num - 0.13) % (2*Math.PI));
        var ring = [];
        for (var j = 0; j < curr_angles.length; j++) {
            var shift = new Shift(next_angles[j], curr_angles[j]);
            ring.push(shift);
        }

        this.rings.unshift(ring);
        this.rings.pop();
    }
}

function gen_rings_radii(num_rings) {
    var max_dist = Math.max(w/2, h/2);
    var interval = max_dist / num_rings;
    var rads = [];
    var curr = 0;
    for (var i = 0; i <= num_rings; i++) {
        rads.push(curr);
        curr += interval;
    }
    return rads;
}

function gen_init_angles(num_angles) {
    var thetas = [];
    for (var i = 0; i <= 2*Math.PI; i += 2*Math.PI/num_angles-0.001) {
        thetas.push(i);
    }
    return thetas;
}

function make_next_angles(curr_angles, momentum_period=15) {
    if (loop_counter%momentum_period == 0){
        shift_angle = Math.random() - 0.5;
    }
    var next_angles = curr_angles.map(num => (num - shift_angle) % (2*Math.PI));
    return next_angles;
}

function launch() {
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    canvas.width = w = window.innerWidth;
    canvas.height = h = window.innerHeight;
    scaleCanvas(canvas, ctx, w, h);
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgb(255, 255, 255)";

    loop_counter = 0;
    num_radii = 150;
    num_angles = 15;
    shift_angle = 0.1;
    var center = new Point(w/2, h/2);
    var radii = gen_rings_radii(num_radii);
    var curr_angles = gen_init_angles(num_angles);
    var next_angles = Array.from(curr_angles);


    shift_rings = [];
    for (var i=0; i < num_radii; i++) {
        next_angles = next_angles.map(num => (num + shift_angle) % (2*Math.PI));
        var ring = [];
        for (var j = 0; j < curr_angles.length; j++) {
            var shift = new Shift(curr_angles[j], next_angles[j]);
            ring.push(shift);
        }
        shift_rings.push(ring);
        curr_angles = next_angles;
    }
    rings = new Rings(shift_rings, radii, center);

    window.requestAnimationFrame(draw);
}

function draw() {
    // wiat half a second before drawing anything else
    sleep(25);

    ctx.fillRect(0, 0, w, h);
    var lines = rings.draw();

    ctx.beginPath();
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var start = line[0];
        var end = line[1];
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
    }
    ctx.stroke();

    rings.update();
    loop_counter++;

    window.requestAnimationFrame(draw);
}

window.addEventListener("load", launch);
