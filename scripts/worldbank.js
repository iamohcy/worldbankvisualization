jQuery(function ($) {

    // Percentage width of screen plot should take up
    var plotRatio = 0.7;
    if (window.innerWidth <= 1400) {
        plotRatio = 0.6;
    }
    if (window.innerWidth <= 1300) {
        plotRatio = 0.5;
    }

    var mainDivMargin = 30;
    // parameters
    var margin = {
        top: 30,
        bottom: 85,
        right: 42,
        left: 80
    };

    // parameters
    var legendMargin = {
        top: 30,
        bottom: 10,
        right: 80,
        left: 30
    };

    // Display globals
    var glowOpacity = 0.27;
    var glowCircleOpacity = 0.27;
    var legendCircleGlowRadius = 12;
    var glowStrokeWidth = 8;
    var colormap = d3.scale.linear()
                       .domain([0, 1, 2])
                       .range(["#5555ff", "#55ff55", "#ff5555"]);
    var legendCircleRadius = 7
    var legendCircleMargin = 6
    var legendCircleWidth = 2 * (legendCircleGlowRadius + legendCircleMargin)
    var legendLineOffset = 13;

    // Animation globals
    var movementTransitionTime = 500;
    var opacityTransitionTime = 250;

    // distance globals
    var axisHeight = 25;
    var padding = 50;
    var plotMargin = 20;
    var scrollbarWidth = 20;

    var titleHeight = 33;
    var scrollWidth = 17;
    var textHeight = $("#information-div").outerHeight() +
                 $("#attribution-div").outerHeight() + 35; // Information text
    var width = window.innerWidth * plotRatio;
    var height = window.innerHeight - textHeight - titleHeight;
    // width = window.innerWidth - mainDivMargin*2 - plotMargin - scrollbarWidth;
    var chooseCountryHeight = 95;
    var legendWidth = window.innerWidth * (1-plotRatio);
    var legendTextWidth = legendWidth - legendMargin.left - legendMargin.right - legendCircleWidth;
    var narrativeTextWidth = legendWidth - legendMargin.left - legendMargin.right;
    var legendHeight = height - chooseCountryHeight;
    var plotWidth = width - margin.left - margin.right;
    var plotHeight = height - margin.top - margin.bottom;

    //scrollmagic globals
    var SMcontroller = new ScrollMagic.Controller();
    var duration = Math.min(200, window.innerHeight / 6);
    // Distance after all plots in group have been displayed to continue showing
    // plots
    var groupPadding = window.innerHeight * 0.7;
    var compGroupPadding = window.innerHeight * 0.45;
    // Distance after we vanish the plots in a group to start showing the plots
    // in the next group
    var groupMargin = window.innerHeight / 5;
    var compGroupMargin = window.innerHeight / 7;

    // Initial distance before things start appearing
    var initialOffset = window.innerHeight / 4;

    var fullyInitialized = false;

    var narrativeStore = {};
    narrativeStore.type = "narrative"
    narrativeStore.offsets = {};
    var actualStore = {};
    actualStore.type = "actual"
    actualStore.wrapOffset = 0;
    actualStore.keys = [];
    var metricStore = {};
    metricStore.type = "metric"
    metricStore.wrapOffset = 0;
    metricStore.keys = [];

    // var allStores = {};
    // allStores.metric = metricStore;
    // allStores.narrative = narrativeStore;
    // allStores.actual = actualStore;
    var currentStore = null;

    var displayActualValuesPlot = makeDisplayFunction(actualStore, getActualFixedKey, getActualCurrentKey, "choose-country-actual", "actual");
    var displayMetricValuesPlot = makeDisplayFunction(metricStore, getMetricFixedKey, getMetricCurrentKey, "choose-metric", "metric");

    var returningToNarrative = false;
    var narrativeMode = "narrative"

    var tutorial = false;

    setTimeout(initializeDoc, 1);

    function initializeDoc() {

        // and heights for existing elements
        $("#axis-div").css("width", width);
        $("#axis-div").css("height", height);
        $("#legend-div").css("height", height);
        $("#legend-div").css("width", legendWidth);
        $("#choose-country-div").css("height", chooseCountryHeight);
        $("#choose-country-div").css("width", legendWidth);

        // Position display controls at the bottom, so must use absolute positioning
        $(".display-controls").css("bottom", "60px");
        $(".display-controls").css("left", "30px");
        $(".display-controls").css("right", "50px");

        $("#legend-choose-div").css("margin-left", "30px");
        $("#legend-choose-div").css("margin-right", "50px");

        // $.getJSON("./sortedData.json", function(data){
        //     $("#main-div").removeClass("hide");
        //     setLoading(false);
        //     fullyInitialized = true;
        //     processData(data);
        // });

        // Change main source country
        $("#choose-country").change(function(){
            resetNarrativeMode("narrative");
        });

        // Change main source country
        $("#choose-countryA, #choose-countryB").change(function(){
            resetNarrativeMode("comparison");
        });


        // Add options to select
        // Use document fragments to save time, since we don"t recalculate flow
        // each time we append
        // Clear all options.
        jsonData["countries"].sort();
        jsonData["metrics"].sort();

        var startCountry = "Singapore";
        var countryA = "United States"
        var countryB = "China"
        $("#choose-country").html("");
        $("#choose-country-actual").html("");
        $("#choose-metric").html("");
        $("#choose-countryA").html("");
        $("#choose-countryB").html("");
        var countryDocFrag = generateChooseFrag(jsonData["countries"], startCountry);
        var metricDocFrag = generateChooseFrag(jsonData["metrics"], null);
        var countryADocFrag = generateChooseFrag(jsonData["countries"], countryA);
        var countryBDocFrag = generateChooseFrag(jsonData["countries"], countryB);
        $("#choose-country-actual").append(countryDocFrag.cloneNode(true));
        $("#choose-country").append(countryDocFrag);
        $("#choose-countryA").append(countryADocFrag);
        $("#choose-countryB").append(countryBDocFrag);
        $("#choose-metric").append(metricDocFrag);

        // Deselect all in choose-country-actual
        $("#choose-country-actual option").prop("selected", false);

        // Add or remove a country from actual display
        $("#choose-country-actual").change(function(event, params){
            // Whether we are selecting or deselecting a country.
            var select = params.selected != undefined;
            if (select) {
                var country = params.selected;
                addPlotAndLegend(country, actualStore, true);
            }
            else {
                var country = params.deselected;
                removePlotAndLegend(country, actualStore);
            }
        });

        // Add or remove a metric from metric display
        $("#choose-metric").change(function(event, params){
            // Whether we are selecting or deselecting a metric.
            var select = params.selected != undefined;
            if (select) {
                var metric = params.selected;
                addPlotAndLegend(metric, metricStore, true);
            }
            else {
                var metric = params.deselected;
                removePlotAndLegend(metric, metricStore);
            }
        });

        // Change metric, go to scroll position of that metric
        $("#choose-metric-group").change(function(){
            var metric = $(this).children("option:selected").html();
            var offset = narrativeStore.offsets[metric];
            if (offset != undefined) {
                $(window).scrollTop(offset);
            }
        });

        $("#choose-country").chosen({no_results_text:"No such country found!"});
        $("#choose-countryA").chosen({no_results_text:"No such country found!"});
        $("#choose-countryB").chosen({no_results_text:"No such country found!"});
        $("#choose-country-actual").chosen({no_results_text:"No such country found!",
                                            width: "100%"});
        $("#choose-metric-group").chosen({no_results_text:"No such metric found!",
                                    width: "100%"});
        $("#choose-metric").chosen({no_results_text:"No such metric found!",
                                    width: "100%"});
        initializeSVGGlobals();

        resetNarrativeMode("narrative");
        // Scroll back to the top of the window
        $(window).scrollTop(0);

        $(".narrative-switch-btn").on("click", returnToNarrative);
        $("#toggle-narrative-mode-btn").on("click", toggleNarrativeMode);
        $(".actual-display-group").css("display", "none");
        $(".metric-display-group").css("display", "none");
        $(".current-country-span").css("display", "none");

        setLoading(false);

        if (tutorial == false) {
            var popupScrollDown = new $.Popup();
            popupScrollDown.open($("#popup-scrolldown"));
            var popupScrollOpen = true;

            // Close the popup after scrolling;
            $(window).scroll(function() {
                if (popupScrollOpen) {
                    popupScrollDown.close();
                }
            });

            var popupClick = new $.Popup();
            var popupClickOpen = false;
            // Tooltip to tell them to click on the thing
            new ScrollMagic.Scene({
                duration: duration*4,    // the scne should last for a scroll distance of 100px
                offset: initialOffset+duration
            })
            .on("enter", function (e) {
                if (!popupClickOpen) {
                    popupClick.open($("#popup-click"));
                    popupClickOpen = true;
                }
            })
            .on("leave", function (e) {
                popupClick.close();
            })
            .addTo(SMcontroller);

            var popupMode = new $.Popup();
            var popupModeOpen = false;
            // Tooltip to tell them to click on the thing
            new ScrollMagic.Scene({
                duration: duration*4,    // the scne should last for a scroll distance of 100px
                offset: initialOffset+6*duration
            })
            .on("enter", function (e) {
                if (!popupModeOpen) {
                    popupMode.open($("#popup-mode"));
                    popupModeOpen = true;
                }
            })
            .on("leave", function (e) {
                popupMode.close();
            })
            .addTo(SMcontroller);
        }
    }

    // Hides or shows the loading screen.
    function setLoading(bool) {
        if (bool) {
            $("#loading-screen").removeClass("hide");
            $("#main-div").addClass("hide");
        }
        else {
            $("#loading-screen").addClass("hide");
            $("#main-div").removeClass("hide");
        }
    }

    // Initialize the axis and all other svg globals
    function initializeSVGGlobals() {
        console.log(jsonData);

        parseDate = d3.time.format("%Y").parse;

        xScale = d3.time.scale()
                    .range([0, plotWidth]);

        yScale = d3.scale.linear()
                    .range([plotHeight, 0]);

        xAxis = d3.svg.axis()
                    .scale(xScale)
                    .orient("bottom");

        yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left");

        actualValueLine = d3.svg.line()
            .x(function(d) { return xScale(parseDate(d[0])); })
            .y(function(d) { return yScale(d[1]); });

        percentileLine = d3.svg.line()
            .x(function(d) { return xScale(parseDate(d[0])); })
            .y(function(d) { return yScale(d[2]); });

        actualStore.line = actualValueLine;
        metricStore.line = percentileLine;

        svg = d3.select("#axis-div").append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    // .attr("id", "axis")
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        narrativeStore.parentSVG = svg;
        actualStore.parentSVG = svg;
        metricStore.parentSVG = svg;

        textSvg = d3.select("#axis-div").append("svg")
                        .attr("width", window.innerWidth)
                        .attr("height", textHeight);
                        // .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Insert before button and selection
        legendSvg = d3.select("#legend-div").insert("svg","#actual-display-controls")
                           .attr("width", legendWidth)
                           .attr("height", legendHeight);
                        // .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // x.domain(d3.extent(data, function(d) { return parseDate(d[0]); }));
        xScale.domain(d3.extent([parseDate("2000"), parseDate("2012")]));

        yScale.domain(d3.extent([0,100]));

        svg.append("g")
           .attr("class", "x axis")
           .attr("transform", "translate(0," + plotHeight + ")")
           .call(xAxis);

        svg.append("g")
           .attr("class", "y axis")
           .call(yAxis)
           .append("text")
           .attr("transform", "rotate(-90)")
           .attr("y", 6)
           .attr("dy", ".71em")
           .style("text-anchor", "end")
           .attr("id", "y-axis-text")
           .text("International Percentile");

        narrativeSVG = svg.append("g")
                           .attr("class", "narrative-display-group");
        actualStore.svg = svg.append("g")
                           .attr("class", "actual-display-group");
        metricStore.svg = svg.append("g")
                           .attr("class", "metric-display-group");

        /* Initialize tooltip */
        // tip = d3.tip().attr("class", "d3-tip s").html(function(d) { return d[2]; });
        tip = d3.tip()
                    .attr("class", "d3-tip")
                    .offset([-10, 0])
                    .html(function(d) {
                        return "<i class='fa fa-circle d3-tip-legend-circle'></i><span>" + d[1] + " (" + d[2] + "%)</span>";
                    })
        /* Invoke the tip in the context of your visualization */
        svg.call(tip)
    }

    // Updates the plots every time we change the base country
    function resetPlotsAndLegend(country) {

        // Reset chosen and actualstore stuff.
        // Remove the country if it was in the actual store
        var index = actualStore.keys.indexOf(country);
        if (index > -1 && index != 0) {
            actualStore.keys.splice(index, 1);
        }
        // Modify the first country in actualStore.
        // This should have been the default current country earlier
        actualStore.keys[0] = country;
        // deselect this country if it was selected
        $("#choose-country-actual option").filter(function(index) {
            // Countries not in data array
            return this.text == country;
        }).prop("selected", false);
        $("#choose-country-actual").trigger("chosen:updated");

        narrativeMode = "narrative";
        $(".comparison-mode-display").css("display", "none");
        $(".narrative-mode-display").css("display", "block");

        // First clear all existing plots and reset variables
        d3.selectAll(".refreshable").remove();

        // Reset stored offsets
        narrativeStore.offsets = {};

        // offset from top of page for that scroll group
        var groupOffset = initialOffset;
        var validMetricGroups = [];
        for (var i = 0; i < plotKeys.length; i++) {
            // plotKeys is global value initialized in plotKeys.js
            var keygroup = plotKeys[i]["keys"];

            // Remove keys with undefined data
            for(var j = keygroup.length - 1; j >= 0; j--) {
                var key = keygroup[j];
                // console.log(key);
                // jsonData is global value initialized in data.js
                var data = jsonData[key]["data"][country];
                if (data == undefined) {
                    keygroup.splice(j, 1);
                }
            }

            if (keygroup.length == 0) {
                continue;
            }
            else {
                validMetricGroups.push(plotKeys[i]["title"])
            }

            var numKeys = keygroup.length;

            var groupLength = numKeys * duration + groupPadding + groupMargin + duration;
            // Add an extra duration for the narrative text offset
            if (plotKeys[i]["countryText"][country] != undefined) {
                groupLength += duration;
            }

            var endGroupOffset = groupOffset + groupLength;
            var startOffset = groupOffset;
            var endOffset = endGroupOffset - duration - groupMargin;

            // Right after everything has been displayed
            var saveOffset = endOffset - (groupPadding/2);
            // Save the end offset (scroll point) for this title/metric
            narrativeStore.offsets[plotKeys[i]["title"]] = saveOffset;

            //
            // Add text for the group
            //
            var textGroup = narrativeSVG.append("g")
                               .attr("class", "groupTextSVG refreshable");
            var groupString = plotKeys[i]["title"];
            var groupTextID = "groupTitle-" + i;
            var groupText = textGroup.append("text")
                               .attr("id", groupTextID)
                               .attr("x", function(d) { return plotWidth/2; })
                               .attr("y", function(d) { return height - margin.bottom + 30; })
                               .text( function (d) { return groupString; })
                               .attr("class", "plotText grey-text")
                               .style("opacity", 0);
            createScrollTrigger(SMcontroller, duration, startOffset, endOffset, "#" + groupTextID);

            for (var j = 0; j < numKeys; j++) {
                var keyID = i + "-" + j // ID to identify elements belonging to this keygroup and key
                var key = keygroup[j];
                var data = jsonData[key]["data"][country];
                var lineColor = getColor(j, numKeys);
                var yIdx = 2;
                var plotID = "plot-" + i + "-" + j;

                // single plot group object
                var gpG = narrativeSVG.append("g")
                             .attr("id", plotID)
                             .attr("class", "refreshable")
                             .style("opacity", 0)
                             .style("display", "none"); // Important to display none, or mouseover for other elements won"t work properly.

                // Draw the path
                drawPath(gpG, data, percentileLine, yIdx, lineColor, keyID, "", false, displayActualValuesPlot);

                var startOffset = j*duration + groupOffset;
                var endOffset = endGroupOffset - duration - groupMargin;
                createScrollTrigger(SMcontroller, duration, startOffset, endOffset, "#" + plotID)
            }

            //
            // Add legend for the group
            //
            var legendGroup = legendSvg.append("g")
                                       .attr("transform", "translate(" + legendMargin.left
                                                                       + "," + legendMargin.top + ")")
                                       .attr("class", "refreshable narrative-display-group");
            var wrapOffset = 0;
            for (var j = 0; j < numKeys; j++) {
                var keyID = i + "-" + j // ID to identify elements belonging to this keygroup and key
                var legendTextID = "legendGroup-" + keyID;
                var legendString = keygroup[j];
                var textY = j*30 + wrapOffset;
                var lineColor = getColor(j, numKeys);
                var legendTextGroup = legendGroup.append("g")
                                              .attr("id", legendTextID)
                                              .style("opacity", 0)
                                              .style("display", "none"); // Important to display none, or mouseover for other elements won"t work properly.

                var numLines = addLegendPoint(legendTextGroup, legendString, lineColor,
                                              textY, keyID, displayMetricValuesPlot);
                wrapOffset += (numLines-1) * legendLineOffset;

                var startOffset = j*duration + groupOffset;
                var endOffset = endGroupOffset - duration - groupMargin;
                createScrollTrigger(SMcontroller, duration, startOffset, endOffset, "#" + legendTextID);
            }

            //
            // Add narrative text for the group
            //
            var narrativeStringList = plotKeys[i]["countryText"][country];
            var narrativeTextOffset = 10; // Distance between narrative text and bottom of legend
            var narrativeWrapOffset = 0;
            var paragraphOffset = 15;
            // start point of the narrative/end of legend
            var narrativeStartOffset = numKeys*30 + wrapOffset + narrativeTextOffset;
            if (narrativeStringList != undefined && narrativeStringList.length > 0) {
                var narrativeTextID = "narrativeGroup-" + i + "-" + j;
                var narrativeTextGroup = legendGroup.append("g")
                                                    .attr("id", narrativeTextID)
                                                    .style("opacity", 0)
                                                    .style("display", "none"); // Important to display none, or mouseover for other elements won"t work properly due to overlap.
                for (var k = 0; k < narrativeStringList.length; k++) {
                    var narrativeString = narrativeStringList[k];
                    var textY = narrativeStartOffset + narrativeWrapOffset;
                    var narrativeText = narrativeTextGroup.append("text")
                                       .attr("x", legendMargin.left)
                                       .attr("y", textY)
                                       .text(narrativeString)
                                       .attr("font-family", "Raleway, sans-serif")
                                       .attr("font-size", "14px")
                                       .attr("class", "grey-text")
                                       // .style("text-anchor", "middle")
                    var numLines = d3TextWrap(narrativeText, narrativeTextWidth, 0, 0)[0];
                    narrativeWrapOffset += (numLines+1) * 14 + paragraphOffset;
                }
                var startOffset = numKeys*duration + groupOffset;
                var endOffset = endGroupOffset - duration - groupMargin;
                createScrollTrigger(SMcontroller, duration, startOffset, endOffset, "#" + narrativeTextID);
            }
            groupOffset = endGroupOffset;
        }
        try {
            // Scroll back to the top of the window
            $(window).scrollTop(0);
        }
        catch(err) {
            alert("Oops! Seems like you may have a popup blocker present. You don't have to disable it but automatic scrolling to the top will be disabled.");
        }

        // We must do this so that the page can be scrolled.
        bodyHeight = groupOffset + initialOffset
        $("body").css("height", bodyHeight);

        // Use document fragments to save time, since we don"t recalculate flow
        // each time we append
        // Clear all options.
        $("#choose-metric-group").html("");
        var docFrag = document.createDocumentFragment();
        for (var i = 0; i < validMetricGroups.length; i++) {
            var metric = validMetricGroups[i];
            var option = document.createElement("option");
            option.textContent = metric;
            docFrag.appendChild(option);
        }
        $("#choose-metric-group").append(docFrag);
        $("#choose-metric-group").trigger("chosen:updated");
    }

    // Updates the plots for comparisons
    function resetPlotsAndLegendComparison(compCountries) {

        narrativeMode = "comparison";
        $(".comparison-mode-display").css("display", "block");
        $(".narrative-mode-display").css("display", "none");

        // First clear all existing plots and reset variables
        d3.selectAll(".refreshable").remove();

        // Reset stored offsets
        narrativeStore.offsets = {};

        var validMetricGroups = [] // Metric groups we have data for
        var commonMetrics = []; // Metrics both countries have data for
        var keyRows = [];
        // Generate the list of common metrics.
        for (var i = 0; i < plotKeys.length; i++) {
            // plotKeys is global value initialized in plotKeys.js
            var keygroup = plotKeys[i]["keys"];
            // Remove keys with undefined data
            for(var j = keygroup.length - 1; j >= 0; j--) {
                var key = keygroup[j];

                var allDataPresent = true;
                // Check if all countries have data for this metric
                for (var k = 0; k < compCountries.length; k++) {
                    var country = compCountries[k];
                    var data = jsonData[key]["data"][country];
                    if (data == undefined) {
                        allDataPresent = false;
                    }
                }
                if (!allDataPresent) {
                    keygroup.splice(j, 1);
                }
                // both countries have data for this metric, add to common metrics
                else {
                    commonMetrics.push(key);
                    keyRows.push([i,j]);
                }
            }

            if (keygroup.length == 0) {
                continue;
            }
            else {
                validMetricGroups.push(plotKeys[i]["title"]);
            }
        }

        // offset from top of page for that scroll group
        var groupOffset = initialOffset;
        var validMetricGroups = [];
        for (var i = 0; i < commonMetrics.length; i++) {

            // plotKeys is global value initialized in plotKeys.js
            var key = commonMetrics[i];
            var yIdx = 2;

            var groupLength = 2 * duration + compGroupPadding + compGroupMargin;
            var endGroupOffset = groupOffset + groupLength;
            // We don't modify the start and end offsets since each group only has
            // one pair of plots to show simultaneously
            var startOffset = groupOffset;
            var endOffset = endGroupOffset - duration - compGroupMargin;

            // Right after everything has been displayed
            var saveOffset = startOffset + duration;
            // Save the end offset (scroll point) for this title/metric
            narrativeStore.offsets[key] = saveOffset;

            //
            // Add text for the group
            //
            var textGroup = narrativeSVG.append("g")
                               .attr("class", "groupTextSVG refreshable");
            var groupString = key;
            var groupTextID = "compGroupTitle-" + keyRows[i][0] + "-" + keyRows[i][1];
            var groupText = textGroup.append("text")
                               .attr("id", groupTextID)
                               .attr("x", function(d) { return plotWidth/2; })
                               .attr("y", function(d) { return height - margin.bottom + 30; })
                               .text( function (d) { return groupString; })
                               .attr("class", "plotText grey-text")
                               .style("opacity", 0);
            createScrollTrigger(SMcontroller, duration, startOffset, endOffset, "#" + groupTextID);

            var wrapOffset = 0;
            //
            // Add legend for the group
            //
            var legendGroup = legendSvg.append("g")
                                       .attr("transform", "translate(" + legendMargin.left
                                                                       + "," + legendMargin.top + ")")
                                       .attr("class", "refreshable narrative-display-group");

            // Add plot for each country for each metric
            for (var k = 0; k < compCountries.length; k++) {
                var country = compCountries[k];
                var keyID = keyRows[i][0] + "-" + keyRows[i][1] + "-" + formatKey(country)

                var data = jsonData[key]["data"][country];
                var lineColor = getColor(k, compCountries.length);
                var plotID = "compare-plot-" + keyID;

                // single plot group object
                var gpG = narrativeSVG.append("g")
                             .attr("id", plotID)
                             .attr("class", "refreshable")
                             .style("opacity", 0)
                             .style("display", "none"); // Important to display none, or mouseover for other elements won"t work properly.

                // Draw the path
                drawPath(gpG, data, percentileLine, yIdx, lineColor, keyID, "", false, null);
                createScrollTrigger(SMcontroller, duration, startOffset, endOffset, "#" + plotID)

                var legendTextID = "comparisonLegendGroup-" + keyID;
                var legendString = country;
                var textY = k*30 + wrapOffset;
                var legendTextGroup = legendGroup.append("g")
                                              .attr("id", legendTextID)
                                              .style("opacity", 0)
                                              .style("display", "none"); // Important to display none, or mouseover for other elements won"t work properly.

                var numLines = addLegendPoint(legendTextGroup, legendString, lineColor,
                                              textY, keyID, displayMetricValuesPlot);
                wrapOffset += (numLines-1) * legendLineOffset;
                createScrollTrigger(SMcontroller, duration, startOffset, endOffset, "#" + legendTextID);
            }

            groupOffset = endGroupOffset;
        }
        try {
            // Scroll back to the top of the window
            $(window).scrollTop(0);
        }
        catch(err) {
            alert("Oops! Seems like you may have a popup blocker present. You don't have to disable it but automatic scrolling to the top will be disabled.");
        }

        // We must do this so that the page can be scrolled.
        bodyHeight = groupOffset + initialOffset
        $("body").css("height", bodyHeight);

        // Use document fragments to save time, since we don"t recalculate flow
        // each time we append
        // Clear all options.
        $("#choose-metric-group").html("");
        var docFrag = document.createDocumentFragment();
        for (var i = 0; i < commonMetrics.length; i++) {
            var metric = commonMetrics[i];
            var option = document.createElement("option");
            option.textContent = metric;
            docFrag.appendChild(option);
        }
        $("#choose-metric-group").append(docFrag);
        $("#choose-metric-group").trigger("chosen:updated");
    }

    function toggleNarrativeMode() {
        if (narrativeMode == "narrative") {
            $("#toggle-narrative-mode-btn").html("GO TO NARRATIVE MODE");
            resetNarrativeMode("comparison");
        }
        else {
            $("#toggle-narrative-mode-btn").html("GO TO COMPARISON MODE");
            resetNarrativeMode("narrative");
        }
    }

    function resetNarrativeMode(mode) {
        // setLoading(true);
        // setTimeout(function() {
        if (mode == "comparison") {
            var countryA = $("#choose-countryA").children("option:selected").html();
            var countryB = $("#choose-countryB").children("option:selected").html();
            var compCountries = [countryA, countryB];
            resetPlotsAndLegendComparison(compCountries);
        }
        else if (mode == "narrative") {
            var country = $("#choose-country").children("option:selected").html();
            window.currentCountry = country;
            resetPlotsAndLegend(currentCountry);
        }
            // console.log("hide");
            // setLoading(false);
        // }, 0);
    }

    function makeDisplayFunction(store, getFixedKey, getCurrentKey, chooseID) {

        var displayFunction = function(d) {
            currentStore = store;

            // Reset variables
            store.wrapOffset = 0;
            // Store body current height and scroll position
            bodyHeight = $("body").height();
            scrollPosition = $(window).scrollTop();

            // Get data from this plot
            var metricID = d3.select(this).attr("keyID");
            var metricIDData = parseKeyID(metricID);
            var group = metricIDData[0]; // The group of keys
            var row = metricIDData[1]; // The row number of the key in this group
            var metric = metricIDData[2];
            var data = jsonData[metric]["data"][currentCountry];
            var type = store.type;
            store.group = group;
            store.row = row;

            var currentKey = getCurrentKey(currentCountry, metric);
            var fixedKey = getFixedKey(currentCountry, metric);
            var keyID = formatKey(currentKey);
            store.fixedKey = fixedKey;

            // Add country to array
            var index = store.keys.indexOf(currentKey);
            if (index == -1) {
                store.keys.push(currentKey);
            }

            if (type == "metric") {
                // Clear initial keys from store if we're in metric mode
                // since that means we're changing metric
                var index = store.keys.indexOf(currentKey);
                if (index > -1 && index != 0) {
                    store.keys.splice(index, 1);
                }
                // Modify the first key in store.
                // This should have been the default current key earlier
                store.keys[0] = currentKey;

                // Show the current country
                $(".current-country-span").css("display", "inline");
                $("#current-country-text").html(currentCountry);
            }

            // Save the valid keys
            store.validKeys = jsonData["valid"][fixedKey];

            // Filter out disabled keys from actualCountries
            var disabledKeys = store.validKeys.slice(0); //Clones array
            // Remove current key from array (since we don"t want to add this
            // key twice)
            var index = disabledKeys.indexOf(currentKey);
            if (index > -1) {
                disabledKeys.splice(index, 1);
            }

            // Hide options without availabe data
            $("#" + chooseID + " option").prop("disabled", false);
            $("#" + chooseID + " option").filter(function(index) {
                // Countries not in data array
                return $.inArray(this.text, disabledKeys) == -1;
            }).prop("disabled", true);
            $("#" + chooseID).trigger("chosen:updated");

            // HIDE PERCENTILE DATA
            d3.selectAll(".narrative-display-group")
                .transition().duration(opacityTransitionTime).ease("sin-in-out")
                .style("opacity", 0.0)
                .each("end", function() {
                    d3.select(this).style("display","none");
                })
            d3.selectAll(".narrative-display-span")
                .style("display", "none");

            // Hide the path we clicked on
            // Remember to reveal it again later
            d3.select("#plot-" + metricID).style("display", "none");

            var lineColor = getColor(0, 1);
            // single plot group object
            var gpG = store.svg.append("g")
                                  .attr("class", type + "-refreshable");

            // We want to draw the orig plot to the parent SVG for animation purposes
            // since we want it to remain even as the rest of the plots are fading
            // in an out. This will prevent the "blinking" bug
            var origSVG = store.parentSVG.append("g")
                                  .attr("class", type + "-refreshable");

            var dataIdx = 2;
            if (type == "actual") {
                dataIdx = 1;
            }

            drawPath(origSVG, data, percentileLine, 2, lineColor, keyID, "orig", false, returnToNarrative);

            if (type == "actual") {
                // ADJUST THE Y AXIS
                var newYDomain = getRangeAll(metric, store.keys);
                // Modify and rescale Y axis
                rescaleYAxis(newYDomain);
                d3.select("#y-axis-text")
                   .text("Actual Values");

                // MOVE THE POINTS
                origSVG.selectAll("path")
                    .transition().duration(movementTransitionTime).ease("sin-in-out")
                    .attr("d", actualValueLine);
                origSVG.selectAll("circle")
                    .transition().duration(movementTransitionTime).ease("sin-in-out")
                    .attr("cy", function(d) { return yScale(d[1]); });
            }

            // Only do all this after everything fades out
            setTimeout(function() {

                // SHOW ACTUAL DATA (must make display visible, even if opacity 0)
                // so sliding path can be seen -> may not longer be valid but it works so
                // I'm not touching it.
                d3.selectAll("." + type + "-display-group" + ", " + "." + type + "-fade-first")
                    .style("display","block")
                    .style("opacity", 0.0);

                // Modify the body height to prevent scrolling
                $("body").css("height", window.innerHeight);
                // ADD NEW LINE AND POINTS
                // Add text for the group
                var textGroup = store.svg.append("g")
                                   .attr("class", "groupTextSVG " + type + "-refreshable " + type + "-fade-first");
                var groupString = plotKeys[group]["keys"][row];
                var groupText = textGroup.append("text")
                                   .attr("x", function(d) { return plotWidth/2; })
                                   .attr("y", function(d) { return height - margin.bottom + 30; })
                                   .text( function (d) { return groupString; })
                                   .attr("class", "plotText grey-text");

                // ADD LEGEND
                var legendGroup = legendSvg.append("g")
                                           .attr("transform", "translate(" + legendMargin.left
                                                                           + "," + legendMargin.top + ")")
                                           .attr("class", "legend-group " + type + "-refreshable " + type + "-fade-first");
                var legendString = currentKey;
                var textY = 0*30 + store.wrapOffset;
                var legendTextGroup = legendGroup.append("g")
                                                 .attr("class", "legend-text-group " + keyID);

                var numLines = addLegendPoint(legendTextGroup, legendString, lineColor,
                                              textY, keyID, returnToNarrative);

                // Save variables
                store.wrapOffset += (numLines-1) * legendLineOffset;
                store.legendGroup = legendGroup;
                store.gpG = gpG;

                // Filter out all countries not in the valid countries list
                var keys = filterValidKeys(store.keys, store.validKeys)

                // Add all keys currently in the store after the animation.
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    // Excluding the current key which we"ve already added
                    if (key != currentKey) {
                        addPlotAndLegend(key, store, true);
                    }
                }

                // Reveal actual data
                d3.selectAll("." + type + "-display-group" + ", " + "." + type + "-fade-first")
                    .transition().duration(opacityTransitionTime).ease("sin-in-out")
                    .style("opacity", 1.0);
            }, opacityTransitionTime);
        };

        return displayFunction;
    }

    // Return to main narrative narrative display
    function returnToNarrative() {

        if (returningToNarrative) {
            return;
        }

        returningToNarrative = true;
        // Save store variables, because we'll be setting currentStore to null
        // before the animation triggers.
        var type = currentStore.type;
        var group = currentStore.group;
        var row = currentStore.row;

        rescaleYAxis([0, 100]);
        // Fade out legend and plot text
        d3.selectAll("." + type + "-fade-first")
            .transition().duration(movementTransitionTime).ease("sin-in-out")
            .style("opacity", 0.0);

        // Transition original path
        d3.selectAll("path.orig")
            .transition().duration(movementTransitionTime).ease("sin-in-out")
            .attr("d", percentileLine);
        d3.selectAll("circle.orig")
            .transition().duration(movementTransitionTime).ease("sin-in-out")
            .attr("cy", function(d) { return yScale(d[2]); });

        setTimeout(function() {
            $("body").css("height", bodyHeight);
            d3.selectAll(".narrative-display-group")
                .style("display","block")
                .style("opacity", 0.0);
            d3.selectAll(".narrative-display-span")
                .style("display","inline");
            // Show back the original plot we clicked on after hiding it.
            d3.select("#plot-" + group + "-" + row)
                .style("opacity",1.0)
                .style("display","block");

            // Modify and rescale Y axis
            d3.select("#y-axis-text")
               .text("International Percentile");

            $(window).scrollTop(scrollPosition);

            // Tween the opacity to reveal the narrative plots
            d3.selectAll(".narrative-display-group")
                .transition().duration(opacityTransitionTime).ease("sin-in-out")
                .style("opacity", 1.0);

            d3.selectAll("." + type + "-display-group").style("display","none");

            // Hide the current country text (only applies to metric mode)
            $(".current-country-span").css("display", "none");

            // Only remove everyting after our animation is done
            setTimeout(function() {
                d3.selectAll("." + type + "-refreshable").remove();
                returningToNarrative = false;
            }, opacityTransitionTime);
        }, movementTransitionTime);

        // reset currentStore values
        currentStore.wrapOffset = 0;
        currentStore = null;
    }

    // Add plot with actual values for a country and key
    function addPlotAndLegend(key, store, hidden) {

        if (store.type == "actual") {
            var country = key;
            var metric = store.fixedKey;
            var dataIdx = 1;
        }
        else if (store.type == "metric") {
            var country = store.fixedKey;
            var metric = key;
            var dataIdx = 2;
        }
        else {
            console.log("invalid type");
            return;
        }
        var data = jsonData[metric]["data"][country];
        if (data == undefined) {
            console.log("missing data");
            return;
        }

        // Add key to array
        var index = store.keys.indexOf(key);
        if (index == -1) {
            store.keys.push(key);
        }

        // Filter out all keys not in the valid keys list
        // Note: JS does not have block scope, only function scope
        // so if you have var key in this loop, it will overwrite
        var validKeys = [];
        for (var i = 0; i < store.keys.length; i++) {
            if ($.inArray(store.keys[i], store.validKeys) != -1) {
                validKeys.push(store.keys[i]);
            }
        }

        var keyIndex = validKeys.indexOf(key);
        var lineColor = getColor(keyIndex, validKeys.length);

        if (store.type == "actual") {
            var newYDomain = getRangeAll(store.fixedKey, validKeys);
            // Modify and rescale Y axis
            // We must do this before drawing the new path
            rescaleYAxis(newYDomain);
            rescalePaths(store.gpG, movementTransitionTime, store);
        }

        // Use key as key this time, since we are varying on that, not the data key
        var keyID = formatKey(key);

        // Now rescale all the other paths to the correct y dimension
        // This time, we want to use the key as the keyID, not the group-row
        drawPath(store.gpG, data, store.line, dataIdx, lineColor, keyID, store.type+"-fade-first", hidden, null);

        // ADD LEGEND
        var legendString = key;
        var textY = keyIndex*30 + store.wrapOffset;
        var legendTextGroup = store.legendGroup.append("g")
                                         .attr("class", "legend-text-group " + keyID);

        // This time, we want to use the key as the keyID, not the group-row
        var numLines = addLegendPoint(legendTextGroup, legendString, lineColor,
                                      textY, keyID, null);
        store.wrapOffset += (numLines-1) * legendLineOffset;

        if (hidden) {
            // Rescale colors
            // Note we must put this in setTimeout, otherwise the legendTextGroup
            // will not have been created by the time that this is called
            setTimeout(function() {
                rescalePaths(store.gpG, opacityTransitionTime, store);
                rescaleLegend(store.legendGroup, store);
            },0);
        }
    }

    function removePlotAndLegend(key, store) {
        var classSelector = formatKey(key);
        store.svg.selectAll("." + classSelector).remove();
        store.legendGroup.selectAll("." + classSelector).remove();

        // Remove country from array
        var index = store.keys.indexOf(key);
        if (index > -1) {
            store.keys.splice(index, 1);
        }

        // Calculate new range
        if (store.type == "actual") {
            var newYDomain = getRangeAll(store.fixedKey, store.keys);
            rescaleYAxis(newYDomain);
        }
        // Rescale plots/paths
        rescalePaths(store.gpG, movementTransitionTime, store);
        rescaleLegend(store.legendGroup, store);
    }

    function rescaleLegend(legendSvg, store) {

        // Filter out all keys not in the valid keys list
        var keys = filterValidKeys(store.keys, store.validKeys)
        store.wrapOffset = 0;
        // We must rescale colors too
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var keyID = formatKey(key);
            var textGroup = legendSvg.selectAll(".legend-text-group." + keyID);
            var numLines = textGroup.attr("numLines");
            var textY = i*30 + store.wrapOffset;
            var newLineColor = getColor(i, keys.length);

            // Animate legend group to new y positions
            textGroup.selectAll("text")
                     .attr("y", textY);
            textGroup.selectAll("tspan")
                     .transition().duration(movementTransitionTime).ease("sin-in-out")
                     .attr("y", textY);
            textGroup.selectAll("circle")
                     .transition().duration(movementTransitionTime).ease("sin-in-out")
                     .attr("cy", textY + 8)
                     .style("fill", newLineColor);

            store.wrapOffset += (numLines-1) * legendLineOffset;
        }
    }

    function rescalePaths(svg, transitionTime, store) {
        // Filter out all countries not in the valid countries list
        var keys = filterValidKeys(store.keys, store.validKeys)

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var keyID = formatKey(key);
            var newLineColor = getColor(i, keys.length);

            if (store.type == "actual") {
                // We must rescale colors too
                // Make opacity full if it was hidden
                svg.selectAll(".line." + keyID)
                    .transition().duration(transitionTime).ease("sin-in-out")
                    .attr("d", actualValueLine)
                    .style("stroke", newLineColor)
                    .style("opacity", 1.0);
                svg.selectAll(".line-glow." + keyID)
                    .transition().duration(transitionTime).ease("sin-in-out")
                    .attr("d", actualValueLine)
                    .style("stroke", newLineColor);
                svg.selectAll("circle." + keyID)
                    .attr("lineColor", newLineColor)
                    .transition().duration(transitionTime).ease("sin-in-out")
                    .style("opacity", 1.0)
                    .attr("cy", function(d) { return yScale(d[1]); });
            }
            else {
                // We must rescale colors too
                // Make opacity full if it was hidden
                svg.selectAll(".line." + keyID)
                    .transition().duration(transitionTime).ease("sin-in-out")
                    .style("stroke", newLineColor)
                    .style("opacity", 1.0);
                svg.selectAll(".line-glow." + keyID)
                    .transition().duration(transitionTime).ease("sin-in-out")
                    .style("stroke", newLineColor);
                svg.selectAll("circle." + keyID)
                    .attr("lineColor", newLineColor)
                    .transition().duration(transitionTime).ease("sin-in-out")
                    .style("opacity", 1.0);
            }
        }
    }

    function getRangeAll(key, countries) {
        var min = Infinity;
        var max = -Infinity;

        for (var i = 0; i < countries.length; i++) {
            var country = countries[i];
            var data = jsonData[key]["data"][country];
            if (data == undefined) {
                continue;
            }

            // ADJUST THE Y AXIS
            var range = getRange(data);
            if (range[0] < min) {
                min = range[0];
            }
            if (range[1] > max) {
                max = range[1];
            }
        }
        var newMin = Math.min(0.0, min); // Start from 0 if possible
        if (max == -Infinity) {
            var newMax = 100;
        }
        else{
            var rangeLength = max - newMin;
            // Expand the range by 5% forward so all values can be displayed
            var expandDist = rangeLength * 0.05;
            var newMax = max + expandDist;
        }

        return [newMin, newMax];
    }

    function filterValidKeys(keysArray, validKeys) {
        // Filter out all keys not in the valid keys list
        var filteredKeys = [];
        for (var i = 0; i < keysArray.length; i++) {
            var key = keysArray[i];
            if ($.inArray(key, validKeys) != -1) {
                filteredKeys.push(key);
            }
        }
        return filteredKeys;
    }

    // Since countries can have multiple words, we need to join the spaces, otherwsie
    // when the key is assigned as a class, it will becauseome multiple classes for
    // each word in the key
    function formatKey(key) {
        return key.replace(/[^a-z0-9]/g, function(s) {
            var c = s.charCodeAt(0);
            if (c == 32) return '-';
            if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
            return '__' + ('000' + c.toString(16)).slice(-4);
        });
    }

    function getColor(idx, numKeys) {
        return colormap(idx / numKeys * 2);
    }

    // Get the range of values for a country and series
    function getRange(data) {
        var dataVals = data.map(function(data) {
            // Data formatted in (year, actual val, narrative) format
            return data[1];
        });
        var minVal = Math.min.apply(Math, dataVals);
        var maxVal = Math.max.apply(Math, dataVals);
        return [minVal, maxVal];
    }

    function rescaleYAxis(yDomain) {
        yScale.domain(yDomain)
        d3.select(".y.axis")
                .transition().duration(movementTransitionTime).ease("sin-in-out")  // https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
                .call(yAxis);
    }

    function mouseOverGlow(d) {
        var keyID = d3.select(this).attr("keyID");
        $("." + "line-glow" + "." + keyID).css("opacity", glowCircleOpacity);
        $("." + "legend-circle-glow" + "." + keyID).css("opacity", glowCircleOpacity);
    }

    function mouseOutGlow(d) {
       var keyID = d3.select(this).attr("keyID");
       $("." + "line-glow" + "." + keyID).css("opacity", "0.0");
       $("." + "legend-circle-glow" + "." + keyID).css("opacity", "0.0");
    }

    function parseKeyID(keyID) {
        var grouprow = keyID.split("-");
        var group = parseInt(grouprow[0]);
        var row = parseInt(grouprow[1]);
        return [group, row, plotKeys[group]["keys"][row]];
    }

    // Functions that set the current vs fixed key
    function getActualCurrentKey(currentCountry, currentMetric) {
        return currentCountry;
    }
    function getActualFixedKey(currentCountry, currentMetric) {
        return currentMetric;
    }
    function getMetricCurrentKey(currentCountry, currentMetric) {
        return currentMetric;
    }
    function getMetricFixedKey(currentCountry, currentMetric) {
        return currentCountry;
    }

    function generateChooseFrag(array, selected) {
        var docFrag = document.createDocumentFragment();
        for (var i = 0; i < array.length; i++) {
            var text = array[i];
            var option = document.createElement("option");
            option.textContent = text;
            // Set start text
            if (selected != null && text == selected) {
                option.selected = true;
            }
            docFrag.appendChild(option);
        }
        return docFrag;
    }
    // Draws a path
    // svgGroup: The group to append the path to
    // data: data of the points
    // line: the line object we use to draw the path
    // yIdx: the idx of the y value in the data points
    // keyID: the keyID of this path in group-row format
    // id: the id of this line
    // clickFunc: the function to call when clicking the line or legend
    // hidden: whether or not to make the path appear by transitioning opacity
    function drawPath(svgGroup, data, line, yIdx, lineColor, keyID, classText, hidden, clickFunc) {

        var opacity = 1.0;
        if (hidden) {
            opacity = 0.0;
        }

        // Add line
        svgGroup.append("path")
           .datum(data)
           .attr("class", "line " + keyID + " " + classText)
           .attr("d", line)
           .attr("keyID", keyID)
           .style("cursor", "pointer")
           .style("opacity", opacity)
           .style("stroke", lineColor);

        // Add line halo
        svgGroup.append("path")
           .datum(data)
           .attr("class", "line-glow " + keyID + " " + classText)
           .attr("d", line)
           .attr("keyID", keyID)
           .style("stroke", lineColor)
           .style("opacity", 0.0)
           .style("cursor", "pointer")
           .style("stroke-width", glowStrokeWidth)
           .on("mouseover", mouseOverGlow)
           .on("mouseout", mouseOutGlow)
           .on("click", clickFunc);

        // Add dots to line plot
        svgGroup.selectAll("dot")
            .data(data)
            .enter().append("circle")
            .attr("class", "circle " + keyID + " " + classText)
            .attr("r", 3.5)
            .attr("cx", function(d) { return xScale(parseDate(d[0])); })
            .attr("cy", function(d) { return yScale(d[yIdx]); })
            .attr("fill", "white")
            .attr("lineColor", lineColor)
            .attr("keyID", keyID)
            .style("opacity", opacity)
            .on("mouseover", function(d) {
                var lineColor = d3.select(this).attr("lineColor");
                tip.show(d);
                $(".d3-tip-legend-circle").css("color", lineColor);
                var keyID = d3.select(this).attr("keyID");
                $("." + "line-glow" + "." + keyID).css("opacity", glowCircleOpacity);
                $("." + "legend-circle-glow" + "." + keyID).css("opacity", glowCircleOpacity);
            })
            .on("mouseout", function(d) {
                tip.hide(d);
                var keyID = d3.select(this).attr("keyID");
                $("." + "line-glow" + "." + keyID).css("opacity", 0.0);
                $("." + "legend-circle-glow" + "." + keyID).css("opacity", 0.0);
            });
    }

    // Adds a legend point to the svgGroup, and returns the number of lines
    // needed for the legend text
    function addLegendPoint(legendTextGroup, legendString, lineColor, textY, keyID, clickFunc) {

        legendTextGroup.attr("keyID", keyID)
                       .style("cursor", "pointer")
                       .on("mouseover", mouseOverGlow)
                       .on("mouseout", mouseOutGlow)
                       .on("click", clickFunc);

        var legendText = legendTextGroup.append("text")
                           .attr("x", legendMargin.left + legendCircleWidth)
                           .attr("y", textY)
                           .text(legendString)
                           .attr("font-family", "Raleway, sans-serif")
                           .attr("font-size", "14px")
                           .attr("class", "grey-text");

        // Actual circle
        legendTextGroup.append("circle")
                       .attr("r", legendCircleRadius)
                       // .attr("fill", function(d) {return color_chart[d];})
                       .attr("cx", legendMargin.left + legendCircleWidth/2)
                       .attr("cy", textY + 8)
                       .attr("keyID", keyID)
                       .style("fill", lineColor);
        // Glow circle
        legendTextGroup.append("circle")
                       .attr("r", legendCircleGlowRadius)
                       // .attr("fill", function(d) {return color_chart[d];})
                       .attr("cx", legendMargin.left + legendCircleWidth/2)
                       .attr("cy", textY + 8)
                       .attr("keyID", keyID)
                       .attr("class", "legend-circle-glow " + keyID)
                       .style("fill", lineColor)
                       .style("opacity", "0.0")
                       .on("mouseover", mouseOverGlow)
                       .on("mouseout", mouseOutGlow)
                       .on("click", clickFunc);

        var numLines = d3TextWrap(legendText, legendTextWidth, 0, 0)[0];
        legendTextGroup.attr("numLines", numLines);

        return numLines;
    }

    // Function that creates a scroll trigger
    // duration: duration of the scroll in pixels (i.e. the duration to tween,
    //           not the duration between the startOffset and the endOffset)
    // startOffset: distance from the top of the page to begin the scroll
    // endOffset: distance from the end of the page to end the scroll
    // elementID: element to fade in or out at the start/end of the scroll
    function createScrollTrigger(SMcontroller, duration, startOffset, endOffset, elementID) {
        // return;

        // appear
        new ScrollMagic.Scene({
            duration: duration,    // the scne should last for a scroll distance of 100px
            offset: startOffset
        })
        // .addIndicators()
        .setTween(elementID, 1, {opacity: 1.0}) // trigger a TweenMax.to tween
        .on("enter", function (e) {
            $(elementID).css("display","block");
        })
        .on("leave", function (e) {
            if (e.scrollDirection == "REVERSE") {
                $(elementID).css("display","none");
            }
        })
        .addTo(SMcontroller);

        // disappear
        new ScrollMagic.Scene({
            duration: duration,    // the scne should last for a scroll distance of 100px
            offset: endOffset
        })
        // .addIndicators()
        .setTween(elementID, 1, {opacity: 0.0}) // trigger a TweenMax.to tween
        .on("enter", function (e) {
            $(elementID).css("display","block");
        })
        .on("leave", function (e) {
            if (e.scrollDirection == "FORWARD") {
                $(elementID).css("display","none");
            }
        })
        .addTo(SMcontroller)

    }

    /**
     * Function allowing to "wrap" the text from an SVG <text> element with <tspan>.
     * Based on https://github.com/mbostock/d3/issues/1642
     * @exemple svg.append("g")
     *      .attr("class", "x axis")
     *      .attr("transform", "translate(0," + height + ")")
     *      .call(xAxis)
     *      .selectAll(".tick text")
     *          .call(d3TextWrap, x.rangeBand());
     *
     * @param text d3 selection for one or more <text> object
     * @param width number - global width in which the text will be word-wrapped.
     * @param paddingRightLeft integer - Padding right and left between the wrapped text and the "invisible bax" of "width" width
     * @param paddingTopBottom integer - Padding top and bottom between the wrapped text and the "invisible bax" of "width" width
     * @returns Array[number] - Number of lines created by the function, stored in a Array in case multiple <text> element are passed to the function
     */
    function d3TextWrap(text, width, paddingRightLeft, paddingTopBottom) {
        paddingRightLeft = paddingRightLeft || 5; //Default padding (5px)
        width = width - (paddingRightLeft * 2); //Take the padding into account

        paddingTopBottom = (paddingTopBottom || 5) - 2; //Default padding (5px), remove 2 pixels because of the borders

        var textAlign = text.attr("text-anchor") || "left";
        var arrLineCreatedCount = [];
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/[ \f\n\r\t\v]+/).reverse(), //Don"t cut non-breaking space (\xA0), as well as the Unicode characters \u00A0 \u2028 \u2029)
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, //Ems
                x = parseFloat(text.attr("x")),
                y = parseFloat(text.attr("y")),
                dy = parseFloat(text.attr("dy")),
                createdLineCount = 1; //Total line created count

            //Clean the data in case <text> does not define those values
            if (isNaN(dy)) dy = 1; //Default padding (1em)
            var dx;
            if (textAlign === "middle") { //Offset the text according to the anchor
                dx = width / 2;
            }
            else { //"left" and "right" //FIXME text-anchor "right" does not have any effect on tspans, only "left" and "middle" -> bug ?
                dx = 0;
            }

            x = ((null === x)?paddingRightLeft:x) + dx; //Default padding (5px)
            y = (null === y)?paddingTopBottom:y; //Default padding (5px)

            var tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
            //noinspection JSHint
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));

                if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    ++createdLineCount;
                }
            }

            arrLineCreatedCount.push(createdLineCount); //Store the line count in the array
        });
        return arrLineCreatedCount;
    }
});
