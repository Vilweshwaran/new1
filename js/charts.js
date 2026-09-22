/**
 * Chart Service
 * Handles Chart.js initialization and updates for history data
 */

const HistoryChart = {
    chart: null,
    maxDataPoints: 20,

    init() {
        const ctx = document.getElementById('historyChart').getContext('2d');
        
        // Chart.js global defaults for dark theme
        Chart.defaults.color = '#9ba1a6';
        Chart.defaults.font.family = "'Inter', sans-serif";

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], // Time labels
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        data: [],
                        yAxisID: 'y',
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHitRadius: 10,
                        fill: true
                    },
                    {
                        label: 'Humidity (%)',
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        data: [],
                        yAxisID: 'y1',
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHitRadius: 10,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 29, 36, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#2a2e39',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        suggestedMin: 15,
                        suggestedMax: 40
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Humidity (%)'
                        },
                        grid: {
                            drawOnChartArea: false, // only want the grid lines for one axis to show up
                        },
                        suggestedMin: 20,
                        suggestedMax: 100
                    }
                }
            }
        });
    },

    update(temperature, humidity) {
        if (!this.chart) return;
        
        // Skip invalid data
        if (temperature === undefined || humidity === undefined || isNaN(temperature) || isNaN(humidity)) {
            return;
        }

        const now = new Date();
        const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        this.chart.data.labels.push(timeLabel);
        this.chart.data.datasets[0].data.push(temperature);
        this.chart.data.datasets[1].data.push(humidity);

        // Remove old data points to keep chart clean
        if (this.chart.data.labels.length > this.maxDataPoints) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
            this.chart.data.datasets[1].data.shift();
        }

        this.chart.update('none'); // Update without full animation for smoother real-time feel
    }
};
