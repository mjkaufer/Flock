console.log(paper)
window.project = project
// Ported from original Metaball script by SATO Hiroyuki
// http://park12.wakwak.com/~shp/lc/et/en_aics_script.html
project.currentStyle = {
    fillColor: 'black'
};

var radiusMin = 30;
var radiusMax = 40;
var eyeDistance = radiusMin * 0.8;
var defaultPadding = 20 + radiusMax;
var currentHue = Math.random()
var bodyConnections = new Group();
var gridCenter = new Point(project.view.size / 2)
console.log(gridCenter)
function getHue(){
    return "hsl(" + currentHue * 360 + ", 50, 50)"
}

function randomPoint(padding) {
    if (!padding) {
        padding = defaultPadding
    }
    var x = (project._view.size._width - padding) * Math.random() + padding / 2;
    var y = (project._view.size._height - padding) * Math.random() + padding / 2;
    return new Point(x, y)
}

var goalLocation = randomPoint(defaultPadding * 4)
var goal = new Path.Circle({
    center: goalLocation,
    radius: radiusMin / 2,
    fillColor: "black"
})

function makeMonster(x, y, radius) {
    if (!x || !y) {
        var p = randomPoint()
        x = p.x
        y = p.y
    }
    if (!radius) {
        radius = Math.random() * (radiusMax - radiusMin) + radiusMin;
    }

    var orientation = Math.random() * 360;
    var eyeRadius = radius / 6

    var center = new Point(x, y);
    var leftEyeCenter = new Point(0, eyeDistance)
    leftEyeCenter.angle = orientation + 30
    var rightEyeCenter = new Point(0, eyeDistance)
    rightEyeCenter.angle = orientation - 30

    var body = new Path.Circle({
        center: center,
        radius: radius,
        fillColor: getHue()
    })
    var group = new Group();

    var pseudoBody = new Path.Circle({
        center: center,
        radius: radius,
        fillColor: "transparent"
    })

    var leftEye = new Path.Circle({
        center: leftEyeCenter + center,
        radius: eyeRadius,
        fillColor: "white"
    })
    var rightEye = new Path.Circle({
        center: rightEyeCenter + center,
        radius: eyeRadius,
        fillColor: "white"
    })

    group.appendBottom(pseudoBody)
    group.appendTop(leftEye)
    group.appendTop(rightEye)

    return {
        flee: false,
        group: group,
        body: body,
        leftEye: leftEye,
        rightEye: rightEye,
        fleeCooldown: 200,
        radius: radius,
        // velocity: Point.random() * 2 - new Point(1, 1),
        velocity: getVectorDeg(Math.random() * 360, 1),
        updateFlee: function() {
            var originalFlee = this.flee

            if (this.fleeCooldown <= 0) {
                if ((group.position - goal.position).length < 150) {
                    this.flee = true
                } else {
                    this.flee = false
                }
                this.fleeCooldown = 200
            } else {
                this.fleeCooldown -= 1
            }
            
        },
        move: function(velocity) {
            this.body.position += velocity
            this.group.position += velocity
            var angle = Math.atan2(velocity.y, velocity.x) * 180 / Math.PI

            this.leftEye.position = this.group.position + getVectorDeg(angle + 30, eyeDistance)
            this.rightEye.position = this.group.position + getVectorDeg(angle - 30, eyeDistance)
            this.velocity = velocity
        }
    };
}

var handle_len_rate = 2.4;
var bodys = [];
var groups = [];
var eyes = [];
var monsters = [];
var radius = 50;
for (var i = 0; i < 10; i++) {
    var monster = makeMonster();
    bodys.push(monster.body);
    groups.push(monster.group);
    eyes.push(monster.leftEye);
    eyes.push(monster.rightEye);
    monsters.push(monster);
}
var eyeConnections = new Group();

window.bodys = bodys
window.eyes = eyes
window.monsters = monsters
var mouseMonster = monsters[0]

function resetBacks() {
    monsters.forEach(function(monster) {
        mouseMonster.body.sendToBack()
    })
}

function tick() {
    currentHue = (currentHue + 0.01) % 1
    monsters.forEach(function(monster, monsterIndex){
        var repulse = new Point(0, 0)

        monsters.forEach(function(otherMonster, otherMonsterIndex) {
            if (monsterIndex == otherMonsterIndex) {
                return
            } else {
                var ratio = Math.pow(otherMonster.radius / monster.radius, 2)
                // var ratio = 1
                var currentRepulse = (monster.body.position - otherMonster.body.position) * ratio
                if (currentRepulse.length > radiusMax * 2.5) {
                    currentRepulse /= Math.pow(currentRepulse.length / 5, 2)
                    repulse += currentRepulse
                }
                
            }
        })

        var corners = [new Point(view.size.width / 2, 0), new Point(view.size.width, view.size.height / 2), new Point(0, view.size.height / 2), new Point(view.size.width / 2, view.size.height)]
        corners.forEach(function(corner, i) {
            var d = monster.group.position - corner
            var n = gridCenter - corner
            var dist = d.dot(n) / n.length
            var cornerRepulse = (gridCenter - monster.group.position)
            if (dist < defaultPadding) {
                repulse = cornerRepulse * 2000
            } else {
                repulse += (cornerRepulse) / cornerRepulse.length / 20
            }
        })

        monster.updateFlee()
        var delta = (goal.position - monster.group.position) * (monster.flee ? -1 : 1)
        // var delta = goal.position - monster.group.position
        delta = delta / delta.length
        // var newVelocity = monster.velocity * 0.995
        // newVelocity += delta * 0.004
        // newVelocity += getVectorDeg(Math.random() * 360, 0.001)
        // monster.move(newVelocity)
        // monster.velocity = newVelocity
        var newVelocity = new Point(0, 0)
        newVelocity += repulse * 0.3
        newVelocity += monster.velocity * 0.9
        newVelocity += delta * 0.1
        newVelocity += getVectorDeg(Math.random() * 360, 0.001) * 0.125
        newVelocity /= newVelocity.length
        monster.move(newVelocity)
        // if (monster.flee) {
        //     monster.body.fillColor = "red"
        // } else {
        //     monster.body.fillColor = "blue"
        // }
        monster.body.fillColor = getHue()
    })


    generateConnections(bodys, false);

    generateConnections(eyes, true);
    resetBacks()

    monsters.forEach(function(monster){
        project.activeLayer.appendTop(monster.group)
    })

    goal.sendToBack()
}

setInterval(tick, 20)


function onMouseMove(event) {

    goal.position = event.point
    // mouseMonster.body.sendToBack()
    // monsters[monsters.length - 1].group.sendToBack()
    


}
tick()
resetBacks()

function generateConnections(paths, isEye) {
    var connections = bodyConnections
    var maxRadius = 150
    var ratio = 0.5
    if (isEye) {
        connections = eyeConnections
        maxRadius = 20
        ratio = 0.7
    }
    // connections.children.forEach(function(child) {
    //     child.remove()
    // })
    // console.log(connections.children.length)
    connections.removeChildren()
    // Remove the last connection paths:
    connections.children = [];

    for (var i = 0, l = paths.length; i < l; i++) {
        for (var j = i - 1; j >= 0; j--) {
            var path = metaball(paths[i], paths[j], ratio, handle_len_rate, maxRadius, isEye);
            if (path) {
                if (isEye) {
                    connections.appendTop(path);
                } else {
                    connections.appendBottom(path);    
                    // path.sendToBack()
                }
                
                // path.removeOnMove();
            }
        }
    }
}

// onMouseMove()
// ---------------------------------------------
function metaball(ball1, ball2, v, handle_len_rate, maxDistance, isEye) {
    var center1 = ball1.position;
    var center2 = ball2.position;
    var radius1 = ball1.bounds.width / 2;
    var radius2 = ball2.bounds.width / 2;
    var pi2 = Math.PI / 2;
    var d = center1.getDistance(center2);
    var u1, u2;

    if (radius1 == 0 || radius2 == 0)
        return;

    if (d > maxDistance || d <= Math.abs(radius1 - radius2)) {
        return;
    } else if (d < radius1 + radius2) { // case circles are overlapping
        u1 = Math.acos((radius1 * radius1 + d * d - radius2 * radius2) /
                (2 * radius1 * d));
        u2 = Math.acos((radius2 * radius2 + d * d - radius1 * radius1) /
                (2 * radius2 * d));
    } else {
        u1 = 0;
        u2 = 0;
    }

    var angle1 = (center2 - center1).getAngleInRadians();
    var angle2 = Math.acos((radius1 - radius2) / d);
    var angle1a = angle1 + u1 + (angle2 - u1) * v;
    var angle1b = angle1 - u1 - (angle2 - u1) * v;
    var angle2a = angle1 + Math.PI - u2 - (Math.PI - u2 - angle2) * v;
    var angle2b = angle1 - Math.PI + u2 + (Math.PI - u2 - angle2) * v;
    var p1a = center1 + getVector(angle1a, radius1);
    var p1b = center1 + getVector(angle1b, radius1);
    var p2a = center2 + getVector(angle2a, radius2);
    var p2b = center2 + getVector(angle2b, radius2);

    // define handle length by the distance between
    // both ends of the curve to draw
    var totalRadius = (radius1 + radius2);
    var d2 = Math.min(v * handle_len_rate, (p1a - p2a).length / totalRadius);

    // case circles are overlapping:
    d2 *= Math.min(1, d * 2 / (radius1 + radius2));

    radius1 *= d2;
    radius2 *= d2;

    var path = new Path({
        segments: [p1a, p2a, p2b, p1b],
        style: ball1.style,
        closed: true
    });
    var segments = path.segments;
    segments[0].handleOut = getVector(angle1a - pi2, radius1);
    segments[1].handleIn = getVector(angle2a + pi2, radius2);
    segments[2].handleOut = getVector(angle2b - pi2, radius2);
    segments[3].handleIn = getVector(angle1b + pi2, radius1);
    return path;
}

// ------------------------------------------------
function getVector(radians, length) {
    return new Point({
        // Convert radians to degrees:
        angle: radians * 180 / Math.PI,
        length: length
    });
}
function getVectorDeg(degrees, length) {
    return new Point({
        // Convert radians to degrees:
        angle: degrees,
        length: length
    });
}
