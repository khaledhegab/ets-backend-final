class MetroRoutes {
  constructor() {
    this.line1 = [
      42, 8, 43, 70, 35, 24, 69, 49, 68, 84, 50, 37, 13, 15, 53, 26, 27, 61, 62,
      1, 5, 10, 22, 21, 51, 46, 38, 66, 36, 41, 17, 6, 32, 52, 56,
    ];

    this.line2 = [
      19, 65, 57, 34, 33, 12, 16, 14, 58, 62, 55, 25, 10, 31, 60, 63, 9, 18, 48,
      3,
    ];

    this.line3_main = [
      4, 45, 73, 59, 44, 7, 30, 11, 40, 39, 20, 47, 67, 71, 29, 2, 23, 28, 25,
      1, 54, 64, 72,
    ];

    this.line3_branch_north = [72, 74, 75, 76, 77, 78, 79];

    this.line3_branch_west = [72, 80, 81, 82, 83, 12];

    this.lines = [
      this.line1,
      this.line2,
      this.line3_main,
      this.line3_branch_north,
      this.line3_branch_west,
    ];
  }

  buildGraph(lines = this.lines) {
    const graph = {};

    lines.forEach((line, lineIndex) => {
      for (let i = 0; i < line.length; i++) {
        const station = line[i];
        if (!graph[station]) graph[station] = [];

        if (i > 0) {
          const prev = line[i - 1];
          graph[station].push({ neighbor: prev, line: lineIndex + 1 });
          graph[prev].push({ neighbor: station, line: lineIndex + 1 });
        }
      }
    });
    return graph;
  }

  findRouteWithLines(start, end) {
    const graph = this.buildGraph();

    const queue = [[start, [{ station: start, line: null }]]];
    const visited = new Set([start]);

    while (queue.length > 0) {
      const [station, path] = queue.shift();

      if (station === end) return path;

      for (const { neighbor, line } of graph[station] || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);

          const lastLine = path[path.length - 1].line;
          const newPath = [...path, { station: neighbor, line }];

          if (lastLine === null || lastLine === line) {
            queue.unshift([neighbor, newPath]);
          } else {
            queue.push([neighbor, newPath]);
          }
        }
      }
    }

    return null;
  }

  calculateStationCount(startStationId, endStationId) {
    if (startStationId === endStationId) {
      return 0; // Same station
    }

    const route = this.findRouteWithLines(startStationId, endStationId);

    if (!route) {
      throw new Error(
        `No route found between station ${startStationId} and station ${endStationId}`
      );
    }

    // Return number of stations minus 1 (excluding start station)
    return route.length - 1;
  }

  getTicketTypeByStationCount(stationCount) {
    if (stationCount <= 0) {
      return "Same Station"; // In case of same station (shouldn't happen normally)
    } else if (stationCount >= 1 && stationCount <= 9) {
      return "Short Distance";
    } else if (stationCount >= 10 && stationCount <= 16) {
      return "Medium Distance";
    } else if (stationCount >= 17 && stationCount <= 23) {
      return "Long Distance";
    } else {
      return "Extended Distance";
    }
  }

  getTripInfo(startStationId, endStationId) {
    const route = this.findRouteWithLines(startStationId, endStationId);

    if (!route) {
      throw new Error(
        `No route found between station ${startStationId} and station ${endStationId}`
      );
    }

    const stationCount = route.length - 1; // Excluding start station
    const ticketType = this.getTicketTypeByStationCount(stationCount);

    // Extract line changes
    const lines = route
      .filter((step) => step.line !== null)
      .map((step) => step.line);
    const uniqueLines = [...new Set(lines)];
    const hasTransfer = uniqueLines.length > 1;

    return {
      startStation: startStationId,
      endStation: endStationId,
      route: route,
      stationCount: stationCount,
      ticketType: ticketType,
      linesUsed: uniqueLines,
      hasTransfer: hasTransfer,
      transferStations: hasTransfer ? this.findTransferStations(route) : [],
    };
  }

  findTransferStations(route) {
    const transfers = [];

    for (let i = 1; i < route.length; i++) {
      const current = route[i];
      const previous = route[i - 1];

      if (current.line !== previous.line && previous.line !== null) {
        transfers.push(previous.station);
      }
    }

    return transfers;
  }

  stationExists(stationId) {
    for (const line of this.lines) {
      if (line.includes(stationId)) {
        return true;
      }
    }
    return false;
  }

  getStationLines(stationId) {
    const stationLines = [];

    this.lines.forEach((line, index) => {
      if (line.includes(stationId)) {
        stationLines.push(index + 1);
      }
    });

    return stationLines;
  }
}

module.exports = new MetroRoutes();
