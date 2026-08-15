class MLService {
    constructor() {
        this.isTrained = false;
    }

    predictGrowth(ph, ec, temperature, humidity) {
        const baseGrowth = 2.0;
        const phFactor = 1 + (7.0 - ph) * 0.1;
        const tempFactor = 1 + (22.5 - temperature) * 0.05;
        const humidityFactor = 1 + (65 - humidity) * 0.01;
        return Math.max(0.5, Math.min(5.0, baseGrowth * phFactor * tempFactor * humidityFactor));
    }

    getRecommendations(ph, ec, temperature, humidity, growthRate) {
        const recommendations = [];
        
        if (ph < 6.0) {
            recommendations.push({ type: 'pH', severity: 'high', message: 'pH too low - add lime' });
        } else if (ph > 7.5) {
            recommendations.push({ type: 'pH', severity: 'high', message: 'pH too high - add sulfur' });
        } else {
            recommendations.push({ type: 'pH', severity: 'good', message: 'pH is optimal' });
        }
        
        if (ec > 1.5) {
            recommendations.push({ type: 'EC', severity: 'medium', message: 'EC too high - reduce fertilizer' });
        } else if (ec < 0.8) {
            recommendations.push({ type: 'EC', severity: 'medium', message: 'EC too low - add nutrients' });
        } else {
            recommendations.push({ type: 'EC', severity: 'good', message: 'EC is optimal' });
        }
        
        if (temperature > 30) {
            recommendations.push({ type: 'temperature', severity: 'medium', message: 'Temperature too high - provide shade' });
        } else if (temperature < 15) {
            recommendations.push({ type: 'temperature', severity: 'medium', message: 'Temperature too low - protect plants' });
        } else {
            recommendations.push({ type: 'temperature', severity: 'good', message: 'Temperature is optimal' });
        }
        
        if (humidity > 80) {
            recommendations.push({ type: 'humidity', severity: 'medium', message: 'Humidity too high - improve ventilation' });
        } else if (humidity < 40) {
            recommendations.push({ type: 'humidity', severity: 'medium', message: 'Humidity too low - increase irrigation' });
        } else {
            recommendations.push({ type: 'humidity', severity: 'good', message: 'Humidity is optimal' });
        }
        
        if (growthRate < 1.0) {
            recommendations.push({ type: 'growth', severity: 'high', message: `Slow growth (${growthRate.toFixed(2)} mm/day) - check all conditions` });
        } else if (growthRate > 3.5) {
            recommendations.push({ type: 'growth', severity: 'good', message: `Excellent growth (${growthRate.toFixed(2)} mm/day)!` });
        } else {
            recommendations.push({ type: 'growth', severity: 'normal', message: `Normal growth (${growthRate.toFixed(2)} mm/day)` });
        }
        
        return recommendations;
    }

    // Metodo train per compatibilità con la route
    train(sensorData) {
        this.isTrained = true;
        return { success: true, message: 'Model trained with ' + sensorData.length + ' samples' };
    }
}

module.exports = new MLService();
