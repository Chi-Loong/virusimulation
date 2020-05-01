function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

var town = [];
var numPeople = 150;
var numResidence = 50, numCompany = 30, numSocial = 0;
var timeStart = 0, numDays = 3;
var infectionChance = 0.02;
var places = [], people = [];
var placesCheck = [];

var tickTime = 250, timePointer = null;
var infectionChart = [];


// Town locations
for (var i= 1; i < 20; i++) {
    for (var j = 1; j < 20; j++) {
        var object = {};
        object.x = i
        object.y = j;
        town.push(object);
    }
}

function initializeModel() {
    shuffleArray(town);
    places = [];
    people = [];
    placesCheck = new Array(numResidence + numCompany + numSocial).fill(0);

    for (var i=0; i < numResidence; i++) {
        var obj = {};
        obj.index = i;
        obj.address = chance.address();
        obj.image = "assets/img/house.svg";
        places.push(obj);
    }

    for (var i=0; i < numCompany; i++) {
        var obj = {};
        obj.index = i + numResidence;
        obj.name = chance.word();
        obj.name = obj.name.charAt(0).toUpperCase() + obj.name.slice(1) + " Industries";
        obj.address = chance.address();
        obj.image = "assets/img/factory.svg";
        places.push(obj);
    }

    for (var i=0; i < numPeople; i++) {
        var obj = {};
        obj.gender = chance.gender();
        obj.name = chance.first({gender: obj.gender}) + " " + chance.last();
        obj.age = chance.age({type: "adult"});
        obj.residence = places[Math.floor(Math.random() * numResidence)];
        obj.company = places[Math.floor(Math.random() * numCompany) + numResidence];
        
        if (i == 0) { //Patient Zero
            obj.health = "sick";
        } else {
            obj.health = "healthy";
        }
        
        people.push(obj);
    }
}

function initializeTownText() {
    var townSVG = d3.select("svg#town")
        .attr("viewBox", "0 0 1000 1000");
        
    var townText = townSVG.append("g")
        .attr("id", "towntext")
        .attr("transform", "translate(500,500)");
        
    townText
        .append("text")
        .style("text-anchor", "middle")
        .style("font-size", "50px")
        .style("font-family", "Bebas Neue")
        .text("Simulation paused...");
        
    townText
        .append("text")
        .attr("y", 50)
        .style("text-anchor", "middle")
        .style("font-size", "50px")
        .style("font-family", "Bebas Neue")
        .text("Set parameters and run simulation!");
        
    townSVG.append("g")
        .append("rect")
        .attr("width", 1000)
        .attr("height", 1000)
        .style("fill", "none")
        .style("stroke", "#000")
        .style("stroke-width", 1);
        
}

function visualizeModel() {
    var townSVG = d3.select("svg#town")
        .attr("viewBox", "0 0 1000 1000");
        
    var xPosition = d3.scaleOrdinal()
      .domain(places.map(d => d.index))
      .range(places.map(d => {
        return 50 * town[d.index].x;
      }));

    var yPosition = d3.scaleOrdinal()
      .domain(places.map(d => d.index))
      .range(places.map(d => {
        return 50 * town[d.index].y;
      }));

    townSVG.append("g")
        .attr("id", "townlocations")
        .selectAll("g").data(places)
        .enter()
        .append("g")
        .attr("transform", function(d, i) {return "translate(" + (xPosition(i) - 15) + ", " + (yPosition(i) + 15) +  ")" })
        .append("image")
        .attr("xlink:href", function(d) { return d.image; })
        .attr("height", 30)
        .attr("width", 30);

    townSVG.append("g")
      .attr("id", "people");
      
    townSVG.select("g#people").selectAll("circle")
      .data(people)
      .enter()
      .append("circle")
        .attr("r", 2.5)
        .attr("stroke", "#b3a2c8")
        .attr("stroke-width", 1);

    var simulation = d3.forceSimulation()
        .force("x", d3.forceX().strength(0.5).x( d => xPosition(getLocationIndex(d, timeStart, 0))))
        .force("y", d3.forceY().strength(0.5).y( d => yPosition(getLocationIndex(d, timeStart, 0))))
        .force("charge", d3.forceManyBody().strength(0.5))
        .force("collide", d3.forceCollide().strength(0.5).radius(3));
        
    // Apply these forces to the nodes and update their positions.
    // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
    simulation
        .nodes(people)
        .on("tick", d => {
          d3.select("g#people").selectAll("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("fill", d => {
                if (d.health == "sick") {
                    return "#f00";
                } else {
                    return"#777";
                }
            });
        });


    var rolling = {
            width: 300,
            height: 300,
            margin: { left: 50, top: 20, right:20, bottom: 50 }
        }

    var rollingSVG = d3.select("svg#chart")
        .attr("viewBox", "0 0 " + rolling.width + " " + rolling.height)
        .append("g")
        .attr("id", "histogram")
        .attr("transform", "translate(" + rolling.margin.left + ", " + rolling.margin.top + " )");
        
    // Add scales for histogram
    var xScale = d3.scaleLinear()
        .domain([0, 24 * numDays])
        .range([0, rolling.width - rolling.margin.left - rolling.margin.right])
    var yScale = d3.scaleLinear()
        .domain([0, numPeople])
        .range([rolling.height - rolling.margin.top - rolling.margin.bottom, 0]);
        
    // Add axes
    rollingSVG.append("g")
        .attr("class", "axis axis-x")
        .attr("transform", "translate(0, " + (rolling.height - rolling.margin.bottom - rolling.margin.top) + ")")
        .call(d3.axisBottom(xScale).ticks(10));
        
    rollingSVG.append("g")
        .attr("class", "axis axis-y")
        .call(d3.axisLeft(yScale).ticks(10));
        
    rollingSVG.append("g")
        .attr("class", "bars");
        
    rollingSVG
        .append("text")
        .attr("transform", "translate(" + (rolling.width / 2) + " ," + (rolling.height - rolling.margin.bottom + 20) + ")")
        .style("text-anchor", "middle")
        .text("Hours Passed");

      // text label for the y axis
    rollingSVG
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - rolling.margin.left)
        .attr("x",0 - (rolling.height / 2))
        .attr("dy", 20)
        .style("text-anchor", "middle")
        .text("Total People Infected");
        
    timePointer = d3.interval(d => {

        var timeIndex = (Math.floor(d / tickTime) + timeStart) % 24;
        var dayIndex =  Math.floor((Math.floor(d / tickTime) + timeStart) / 24);
            
        placesCheck.fill(0);
            
        // Check for sick people at locations
        for (var i= 0; i < numPeople; i++) {
            if (people[i].health == "sick") {
                placesCheck[getLocationIndex(people[i], timeIndex, dayIndex)]++;
            }
        }

        // Infect people at locations
        
        for (var i= 0; i < numPeople; i++) {
        
            if (placesCheck[getLocationIndex(people[i], timeIndex, dayIndex)] > 0) {
                
                var infectedPeople = placesCheck[getLocationIndex(people[i], timeIndex, dayIndex)];
                
                // Infection chance is compounded for EACH infected person
                var chance = 1 - Math.pow(1 - infectionChance, infectedPeople);
                var health = Math.random();
                
                if (health <= chance && people[i].health == "healthy") {
                    people[i].health = "sick";
                }
                
            }
        }
        
        // For charting infection rate
        infectionChart.push(placesCheck.reduce((a, b) => a + b, 0));
        updateChart();
        
        // Simulation update
        simulation
        .force("x", d3.forceX().strength(0.5).x( e => xPosition(getLocationIndex(e, timeIndex, dayIndex)) ))
        .force("y", d3.forceY().strength(0.5).y( e => yPosition(getLocationIndex(e, timeIndex, dayIndex)) ))
        .alpha(0.2);
        
        var shiftText = "";
        if (timeIndex <= 8 || timeIndex > 22) {
            shiftText = "Home";
        } else if (timeIndex > 8) {
            shiftText = "Work";
        }

        d3.select("p#timetext")
            .text("Day " + dayIndex + ", " + timeIndex + " hrs");
            
        d3.select("p#shifttext")
            .text(shiftText);
            
        d3.select("p#sicktext")
            .text(placesCheck.reduce((a, b) => a + b, 0) + " in " + numPeople + " infected");
        
        
        if (d > tickTime * 24 * numDays) { 
            timePointer.stop();
            d3.timeout(() => updateChart(), tickTime);
        }
        
    }, tickTime)

    function getLocationIndex(person, timeIndex, dayIndex) {
     
        if (timeIndex < 8 || timeIndex > 22) {
            return person.residence.index;
        } else {
            return person.company.index;
        }
    }

    function updateChart() {
        rollingSVG.select("g.bars").selectAll("rect")
            .data(infectionChart)
            .join(
            enter => enter
                .append("rect")
                .attr("x", (d, i) => xScale(i))
                .attr("y", d => yScale(d))
                .attr("width", rolling.width / (24 * numDays))
                .attr("height", 0),
            update => update
                .attr("x", (d, i) => xScale(i))
                .attr("y", d => yScale(d))
                .attr("width", rolling.width / (24 * numDays))
                .attr("height", d => (rolling.height - rolling.margin.bottom - rolling.margin.top) - yScale(d))
                .attr("fill", "#f00"),
            exit => exit
                .attr("height", 0)
                .remove()
            );
    }
}

function resetCharts() {
    if (timePointer != null) { timePointer.stop(); }
    
    d3.select("svg#town").selectAll("g").remove();
    d3.select("svg#chart").selectAll("g").remove();
}

$("#controls_people").change(function() {
    numPeople = parseInt($("#controls_people").val());
    resetCharts();
    initializeTownText();
});

$("#controls_homes").change(function() {
    numResidence = parseInt($("#controls_homes").val());
    resetCharts();
    initializeTownText();
});

$("#controls_workplaces").change(function() {
    numCompany = parseInt($("#controls_workplaces").val());
    resetCharts();
    initializeTownText();
});

$("#controls_days").change(function() {
    numDays = parseInt($("#controls_days").val());
    resetCharts();
    initializeTownText();
});

$("#controls_infection_chance").change(function() {
    infectionChance = parseFloat($("#controls_infection_chance").val());
    resetCharts();
    initializeTownText();
});

$("#controls_speed").change(function() {
    tickTime = parseInt($("#controls_speed").val());
    resetCharts();
    initializeTownText();
});

$("#run_simulation").click(function() {
    resetCharts();
    initializeModel();
    
    infectionChart = [];
    visualizeModel();
});

$(document).ready(function() {
    initializeTownText();
    
    var anim = new TimelineLite();
    anim.set("#virusAnimation", {autoAlpha: 1}, 0)
    
    anim.staggerFrom("#virusAnimation g#outline path", 3, {drawSVG:"0%"}, 0.2, 0)
        .staggerFrom("#virusAnimation g#background path", 1, {autoAlpha:0, scale:0, transformOrigin:"50% 50%"}, 2, 3)
        .staggerFrom("#virusAnimation g#background circle", 1, {autoAlpha:0, scale:0, transformOrigin:"50% 50%"}, 0.25, 4);
        
    anim.to("#virusAnimation", 5, {rotation:360, transformOrigin:"50% 50%"}, 6);

});
