Date.prototype.toShortFormat = function() {

    let monthNames =["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    
    let day = this.getDate();
    
    let monthIndex = this.getMonth();
    let monthName = monthNames[monthIndex];
    
    let year = this.getFullYear();
    
    return `${day}-${monthName}-${year}`;  
}

let today = new Date();
module.exports = today.toShortFormat();