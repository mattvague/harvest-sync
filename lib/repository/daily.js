"use strict"

let Promise = require("promise")
let datle = require("../datle")
let undatle = require("../undatle")
let nextday = require("nextday")

let DailyRepo
module.exports = DailyRepo = {
    /**
     * Performs a reduce on the 'projects' array from /daily.
     *
     * @param harvest
     * @param initialCarry
     * @param cb
     * @returns Promise
     */
    reduceProjects: (harvest, initialCarry, cb) => {
        return new Promise(function (resolve, reject) {
            harvest.TimeTracking.daily({}, function(err, data) {
                if(err) {
                    reject(err)
                }
                else {
                    if(!data.projects || !data.projects.length) resolve(initialCarry)

                    let result = data.projects.reduce(cb, initialCarry)

                    resolve(result)
                }
            })
        })
    },

    reduceDayEntries: (harvest, date, initialCarry, cb) => {
        // there's a bug in node-harvest, that doesn't get the
        // correct day-of-year for date times before noon? so, just make
        // the date noon
        let dateCorrected = noon(date)
        return new Promise(function (resolve, reject) {
            harvest.TimeTracking.daily({"date": dateCorrected}, function(err, data) {
                if(err) {
                    reject(err)
                }
                else {
                    if(!data.day_entries || !data.day_entries.length) resolve(initialCarry)

                    let result = data.day_entries.reduce(cb, initialCarry)

                    resolve(result)
                }
            })
        })
    },

    getDayTimes: (harvest, date) => {
        return DailyRepo.reduceDayEntries(harvest, date, [], (times, entry) => {
            let time = buildTimeFromHarvestEntry(entry)

            times.push(time)

            return times
        })
    },

    addTime: (harvest, time) => {
        return new Promise(function (resolve, reject) {
            harvest.TimeTracking.create(buildHarvestEntryFromTime(time), function(err, data) {
                if(err) {
                    reject(err)
                }
                else {
                    if(!data.id) reject(new Error("Something went wrong while adding time to Harvest."))
                    else resolve()
                }
            })
        })
    },

    getPeriodTimes: (harvest, startDate, endDate) => {
        let allPromises = []

        endDate = endDate || new Date() // today
        let currentDate = new Date(startDate.getTime())
        let endTime = endDate.getTime()

        while(currentDate.getTime() <= endTime) {
            allPromises.push(DailyRepo.getDayTimes(harvest, currentDate))

            // next day
            currentDate = nextday(currentDate)
        }

        return Promise.all(allPromises)
            .then((values) => {
                return Promise.resolve(values.reduce((times, day) => {
                    day.forEach((time) => times.push(time))
                    return times
                }, []))
            })
    },
}

function noon(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12,0)
}


function buildTimeFromHarvestEntry(entry) {
    return {
        id: parseInt(entry.id),
        projectId: parseInt(entry.project_id),
        taskId: parseInt(entry.task_id),
        notes: entry.notes + "",
        hours: parseFloat(entry.hours),
        hoursHuman: hoursFloatToStr(parseFloat(entry.hours) ),
        date: datle(entry.spent_at),
    }
}

function buildHarvestEntryFromTime(time) {
    return {
        notes: time.notes,
        hours: time.hours,
        project_id: time.projectId,
        task_id: time.taskId,
        spent_at: time.date
    }
}

function hoursFloatToStr(hoursFloat) {
    let hoursInt = Math.floor(hoursFloat)
    let minsFloat = hoursFloat - hoursInt
    let minsInt = Math.floor(minsFloat * 60)

    return "" + hoursInt + ":" + ("0" + minsInt).slice(-2)
}
