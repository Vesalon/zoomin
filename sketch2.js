function launch() {
    canvas = document.getElementById('canvas');
    canvas.width = w = window.innerWidth;
    canvas.height = h = window.innerHeight;

    gl = canvas.getContext('webgl');
    if (!gl) {
        console.error('WebGL not supported');
    }

    const vertexShaderSource = `
        attribute vec2 position;
    
        void main() {
        gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    const fragmentShaderSource = `
      precision mediump float;
    
      void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      }
    `;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    gl.useProgram(shaderProgram);



    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    const positionAttribLocation = gl.getAttribLocation(shaderProgram, 'position');
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);


    loop_counter = 0;
    // num_radii = 200;
    // num_angles = 20;
    // shift_angle = 0.1;

    var center = new Point(w/2, h/2);

    rings = make_rings(center, 20, 1, 0.1);
    rings2 = make_rings(center, 200, 18, 0.1);
    // rings2 = make_rings(center, radii);
    draw();
}

function make_rings(center, num_radii, num_angles, shift_angle) {
    var radii = gen_rings_radii(num_radii);
    var curr_angles = gen_init_angles(num_angles);
    var next_angles = Array.from(curr_angles);
    var shift_rings = [];
    for (var i=0; i < num_radii; i++) {
        var next_angles = next_angles.map(num => (num + shift_angle) % (2*Math.PI));
        var ring = [];
        for (var j = 0; j < curr_angles.length; j++) {
            var shift = new Shift(curr_angles[j], next_angles[j]);
            ring.push(shift);
        }
        shift_rings.push(ring);
        curr_angles = next_angles;
    }
    var rings = new Rings(shift_rings, radii, center);
    return rings;
}


// Standard Normal variate using Box-Muller transform.
function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
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
    }

    polar_to_cartesian(r, theta, center) {
        var x = center.x + r * Math.cos(theta);
        var y = center.y + r * Math.sin(theta);
        return new Point(x, y);
    }
}

class Rings {
    constructor(
        shifts,
        radii,
        center,
        max_shift_angle=2.15,
        momentum=50,
        impulse=26
    ) {
        // shifts are lists of shifts
        this.shifts = shifts;
        this.radii = radii;
        this.center = center;
        this.max_shift_angle = max_shift_angle;
        this.momentum = momentum;
        this.impulse = impulse;
        this.shift_angle = 0;
    }

    draw() {
        var lines = [];
        for (var i = 0; i < this.shifts.length; i++) {
            var ring = this.shifts[i];
            for (var j = 0; j < ring.length; j++) {
                var line = ring[j].draw(this.center, this.radii[i], this.radii[i+1]);
                lines.push(line);
            }
        }
        return lines;
    }

    update() {
        var curr_angles = this.shifts[0].map(shift => shift.angle);
        var next_angles = this.make_next_angles(curr_angles, this.momentum, this.impulse);
        var ring = [];
        for (var j = 0; j < curr_angles.length; j++) {
            var shift = new Shift(next_angles[j], curr_angles[j]);
            ring.push(shift);
        }

        this.shifts.unshift(ring);
        this.shifts.pop();
    }
    make_next_angles(curr_angles, momentum_period=15, impulse_period=7) {
        var cycle_ind = loop_counter%momentum_period;
        if (cycle_ind == 0){
            // this.final_shift_angle = gaussianRandom(mean=0, stdev=0.5);
            this.final_shift_angle = this.max_shift_angle*(Math.random() - 0.5);
            this.old_shift_angle = this.shift_angle;
        }
        if (cycle_ind <= impulse_period){
            var diff = (this.final_shift_angle - this.old_shift_angle);
            this.shift_angle = this.old_shift_angle + (cycle_ind * diff/impulse_period);
        }
        var next_angles = curr_angles.map(num => (num - this.shift_angle) % (2*Math.PI));
        return next_angles;
    }
    
    make_next_angles2(curr_angles, momentum_period=15, impulse_period=7) {
        var cycle_ind = loop_counter%momentum_period;
        if (cycle_ind == 0){
            root_shift_angle = 0.7*(Math.random() - 0.5);
            this.final_shift_angles = curr_angles.map(_ => root_shift_angle + 0.003*(Math.random() - 0.5))
        }
        if (cycle_ind <= impulse_period){
            this.shift_angles = this.final_shift_angles.map(n => n * cycle_ind/impulse_period);
        }
        var next_angles = curr_angles.map((num, i) => (num - this.shift_angles[i]) % (2*Math.PI));
        return next_angles;
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
    for (var i = 0; i <= 2*Math.PI; i += 2*Math.PI/num_angles-0.00001) {
        thetas.push(i);
    }
    return thetas;
}

function convertCanvasToWebGLCoordinates(point, center) {
    // Calculate the normalized device coordinates for WebGL
    const glX = (point.x - center.x) / center.x;
    const glY = (center.y - point.y) / center.y;
    return { x: glX, y: glY };
}

var fps = 35; // Desired frame rate in frames per second
var interval = 1000 / fps; // Calculate the interval in milliseconds

var lastDrawTime = 0;



function draw(currentTime) {
    if (currentTime - lastDrawTime > interval) {

        vertices0 = rings.draw();
        vertices0 = vertices0.map(line => [
                convertCanvasToWebGLCoordinates(line[0], rings.center),
                convertCanvasToWebGLCoordinates(line[1], rings.center)
        ]);
        vertices0 = vertices0.map(line => [line[0].x, line[0].y, line[1].x, line[1].y]).flat();

        // vertices2 = rings2.draw();
        // vertices2 = vertices2.map(line => [
        //         convertCanvasToWebGLCoordinates(line[0], rings2.center),
        //         convertCanvasToWebGLCoordinates(line[1], rings2.center)
        // ]);
        // vertices2 = vertices2.map(line => [line[0].x, line[0].y, line[1].x, line[1].y]).flat();
        vertices2 = [];

        vertices = vertices0.concat(vertices2)

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.LINES, 0, vertices.length);
        lastDrawTime = currentTime;
        rings.update();
        rings2.update();
        loop_counter++;
    }

    window.requestAnimationFrame(draw);
}


window.addEventListener("load", launch);





