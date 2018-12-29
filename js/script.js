var width = project.view.size.width
var height = project.view.size.height

project.currentStyle = {
    fillColor: 'black'
};

var radiusMin = 10;
var radiusMax = 15;
var eyeDistance = radiusMin * 0.8;
var defaultPadding = 20 + radiusMax;
var currentHue = Math.random()
var bodyConnections = new Group();

var goals = []
var goalLocation = randomPoint(defaultPadding * 4)

var goal = makeGoal(goalLocation.x, goalLocation.y, repulseThreshold, "black")
makeGoal(width / 4, height / 4, repulseThreshold * 0.5)
makeGoal(width * 3 / 4, height / 4, repulseThreshold * 0.5)
makeGoal(width * 3 / 4, height * 3 / 4, repulseThreshold * 0.5)
makeGoal(width / 4, height * 3 / 4, repulseThreshold * 0.5)


var handle_len_rate = 2.4;
var bodys = [];
var groups = [];
var eyes = [];
var monsters = [];
var numMonsters = 5

function onMouseUp(event) {
    console.log(event)
    if (event.event.shiftKey) {
        removeMonster()
    } else {
        addMonster(event.event.clientX, event.event.clientY)    
    }
    
}

function addMonster(x, y) {
    var monster = makeMonster(x, y);
    bodys.push(monster.body);
    groups.push(monster.group);
    eyes.push(monster.leftEye);
    eyes.push(monster.rightEye);
    monsters.push(monster);
}

function removeMonster() {
    if (monsters.length == 0) {
        return
    }
    var monster = monsters.splice(-1)
    var group = groups.splice(-1)[0]
    var eyePair = eyes.splice(-2)
    var body = bodys.splice(-1)[0]
    group.remove()
    eyePair.forEach(function(eye){
        eye.remove()
    })
    body.remove()
}

for (var i = 0; i < numMonsters; i++) {
    addMonster()
}

var eyeConnections = new Group();

var neighborhoodSize = radiusMax * 5
var repulseThreshold = neighborhoodSize
var minSpacing = radiusMax * 1.5
var learnRate = 0.05

function tick() {
    currentHue = (currentHue + 0.0005) % 1
    monsters.forEach(function(monster, monsterIndex){

        var nearbyMonsters = monsters.filter(function(otherMonster, otherMonsterIndex) {
            if (monsterIndex == otherMonsterIndex) {
                return false
            } else if ((monster.body.position - otherMonster.body.position).length < neighborhoodSize) {
                return true
            } else {
                return false
            }
        })

        // align to neighbors
        var alignment = getVectorDeg(monster.orientation, 1)

        nearbyMonsters.forEach(function(nearbyMonster) {
            alignment += getVectorDeg(nearbyMonster.orientation, 1)
        })

        if (nearbyMonsters.length > 0) {
            alignment /= (nearbyMonsters.length + 1)
        }

        // move away from neighbors too close, move to center
        var repulsion = new Point(0, 0)
        var center = new Point(0, 0)
        var repelling = false
        nearbyMonsters.forEach(function(nearbyMonster) {
            var delta = nearbyMonster.body.position - monster.body.position
            // move away
            if (delta.length < minSpacing) {
                var magnitude = 1 - (delta.length / minSpacing)
                repulsion -= delta.normalize() * magnitude
                repelling = true
            } else {
                // move to center
                center = center + delta
            }
        })


        if (nearbyMonsters.length > 0) {
            alignment /= (nearbyMonsters.length + 1)
            center /= (nearbyMonsters.length)
            center = center.normalize() / 100
        }

        var obstacleRepulsion = new Point(0, 0)

        for (var i = 0; i < goals.length; i++) {
            var currentGoal = goals[i]
            var obstacleDelta = monster.body.position - currentGoal.position
            var repulseDistance = obstacleDelta.length
            if (repulseDistance <= repulseThreshold) {
                var beta = 1 - (repulseDistance / repulseThreshold)

                monster.magnitude = Math.max(0.75 + 0.1 * monster.magnitude + 1.25 * Math.sqrt(beta), 1)
                obstacleRepulsion += obstacleDelta
            } else if (monster.magnitude > 1) {
                monster.magnitude *= 0.95
            }
        }
        

        var random = getVectorDeg(Math.random() * 360, 1) / 100

        var direction = random + alignment + repulsion + obstacleRepulsion + center

        monster.newOrientation = direction.angle * learnRate + monster.orientation * (1 - learnRate)

        monster.body.fillColor = getHue(monster)
    })

    monsters.forEach(function(monster) {
        monster.orientation = monster.newOrientation
        monster.move()
        monster.body.position.x = (monster.body.position.x + 2 * width) % width
        monster.body.position.y = (monster.body.position.y + 2 * height) % height
        monster.group.position.x = (monster.group.position.x + 2 * width) % width
        monster.group.position.y = (monster.group.position.y + 2 * height) % height
    })


    generateConnections(bodys, false);
    generateConnections(eyes, true);

    monsters.forEach(function(monster){
        project.activeLayer.appendTop(monster.group)
    })

}

tick()
setInterval(tick, 20)

function onMouseMove(event) {
    goal.position = event.point
}

function generateConnections(paths, isEye) {
    var connections = bodyConnections
    var maxRadius = 50
    var ratio = 0.5
    if (isEye) {
        connections = eyeConnections
        maxRadius = 5
        ratio = 0.7
    }

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
                }
            }
        }
    }
}

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
        length: (length || 1)
    });
}
function getVectorDeg(degrees, length) {
    return new Point({
        // Convert radians to degrees:
        angle: degrees,
        length: (length || 1)
    });
}
function getHue(monster){
    var l = 50
    if (monster) {
        l *= (1 / monster.magnitude)
    }
    return "hsl(" + currentHue * 360 + ", 50, " + l + ")"
}

function randomPoint(padding) {
    if (!padding) {
        padding = defaultPadding
    }
    var x = (project._view.size._width - padding) * Math.random() + padding / 2;
    var y = (project._view.size._height - padding) * Math.random() + padding / 2;
    return new Point(x, y)
}

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
        group: group,
        body: body,
        leftEye: leftEye,
        rightEye: rightEye,
        radius: radius,
        orientation: orientation,
        magnitude: 1,
        move: function() {
            var velocity = getVectorDeg(this.orientation, this.magnitude)
            this.body.position += velocity
            this.group.position += velocity

            this.leftEye.position = this.group.position + getVectorDeg(this.orientation + 30, eyeDistance)
            this.rightEye.position = this.group.position + getVectorDeg(this.orientation - 30, eyeDistance)
        }
    };
}

function makeGoal(x, y, power, color) {
    var newGoal = new Path.Circle({
        center: new Point(x, y),
        radius: radiusMin / 2,
        fillColor: color || "#777"
    })
    newGoal.power = (power || radiusMax * 2)
    goals.push(newGoal)
    return newGoal
}