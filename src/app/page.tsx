'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface UserStats {
  total: number;
  nuevos_este_mes: number;
  tests_totales: number;
  mensajes_totales: number;
}

interface DataPoint {
  name: string;
  value: number;
}

interface AgeDataPoint {
  name: string;
  count: number;
}

interface MonthlyData {
  month?: string;
  name: string;
  usuarios: number;
  tests: number;
}

interface MessageData {
  dia: string;
  mensajes: number;
  chatbots: number;
}

interface CorrelationData {
  score: string;
  promedio_mensajes: number;
}

interface Efectividad {
  porcentaje_mejora: number;
}

interface Retencion {
  promedio_meses_uso: number;
  tasa_retencion: number;
}

interface PatronUso {
  hora: number;
  mensajes: number;
}

interface ResponseAnalysis {
  commonPatterns: string[];
  keyInsights: string[];
  recommendedActions: string[];
}

interface GeminiInsights {
  effectiveness?: { insight: string; score: number };
  significantPatterns?: string[];
  correlations?: string[];
  temporalTrends?: string[];
  recommendations?: string[];
  responseAnalysis?: ResponseAnalysis;
}

interface StatsData {
  userStats: UserStats;
  anxietyLevels: DataPoint[];
  depressionLevels: DataPoint[];
  ageDistribution: AgeDataPoint[];
  genderDistribution: DataPoint[];
  monthlyActivity: MonthlyData[];
  messageActivity: MessageData[];
  correlationData: CorrelationData[];
  efectividad: Efectividad;
  retencion: Retencion;
  patronesUso: PatronUso[];
  geminiInsights?: GeminiInsights;
}

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    userStats: {
      total: 0,
      nuevos_este_mes: 0,
      tests_totales: 0,
      mensajes_totales: 0
    },
    anxietyLevels: [],
    depressionLevels: [],
    ageDistribution: [],
    genderDistribution: [],
    monthlyActivity: [],
    messageActivity: [],
    correlationData: [],
    efectividad: { porcentaje_mejora: 0 },
    retencion: { promedio_meses_uso: 0, tasa_retencion: 0 },
    patronesUso: [],
    geminiInsights: {
      effectiveness: { insight: "", score: 0 },
      significantPatterns: [],
      correlations: [],
      temporalTrends: [],
      recommendations: [],
      responseAnalysis: {
        commonPatterns: [],
        keyInsights: [],
        recommendedActions: []
      }
    }
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        
        if (data.success) {
          setStats(data.stats);
        } else {
          console.error('Error al cargar datos:', data.error);
        }
      } catch (error) {
        console.error('Error al obtener datos del dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Cargando datos del dashboard...</div>
      </div>
    );
  }

  // Tarjetas con estadísticas generales
  interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    color: string;
  }
  
  const StatCard = ({ title, value, description, color }: StatCardProps) => (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color}`}>
      <h3 className="text-lg font-semibold text-gray-600">{title}</h3>
      <p className="text-3xl font-bold my-2">{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Serenity</h1>
        <p className="text-gray-600">Análisis de datos de salud mental y actividad de usuarios</p>
      </div>

      {/* Resumen estadístico */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Usuarios Totales" 
          value={stats.userStats.total} 
          description={`${stats.userStats.nuevos_este_mes} nuevos usuarios este mes`} 
          color="border-blue-500"
        />
        <StatCard 
          title="Tests Realizados" 
          value={stats.userStats.tests_totales} 
          description="Evaluaciones de ansiedad y depresión" 
          color="border-green-500"
        />
        <StatCard 
          title="Efectividad" 
          value={`${stats.efectividad.porcentaje_mejora}%`} 
          description="Usuarios que reportan mejoría" 
          color="border-red-500"
        />
        <StatCard 
          title="Mensajes" 
          value={stats.userStats.mensajes_totales} 
          description="Mensajes intercambiados en total" 
          color="border-purple-500"
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Distribución de niveles de ansiedad */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Distribución de Niveles de Ansiedad</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.anxietyLevels}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.anxietyLevels.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución de niveles de depresión */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Distribución de Niveles de Depresión</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.depressionLevels}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.depressionLevels.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Distribución por edad */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Distribución por Edad</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.ageDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" name="Usuarios" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución por género */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Distribución por Género</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.genderDistribution}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.genderDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actividad mensual */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Actividad Mensual</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthlyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="usuarios" stroke="#8884d8" activeDot={{ r: 8 }} name="Nuevos Usuarios" />
              <Line type="monotone" dataKey="tests" stroke="#82ca9d" name="Tests Realizados" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actividad de mensajes y correlación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Actividad de mensajes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Actividad de Mensajes (Última Semana)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.messageActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="mensajes" fill="#8884d8" name="Mensajes Totales" />
              <Bar dataKey="chatbots" fill="#82ca9d" name="Respuestas Bot" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Correlación entre niveles y uso */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Correlación: Nivel de Ansiedad y Uso</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.correlationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="score" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="promedio_mensajes" fill="#FF8042" name="Promedio Mensajes/Semana" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Análisis de Gemini */}
      {stats.geminiInsights && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Análisis de IA - Gemini</h2>
          
          {/* Patrones Significativos */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Patrones Significativos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.geminiInsights.significantPatterns && stats.geminiInsights.significantPatterns.map((pattern, index) => (
                <div key={index} className="bg-blue-50 p-3 rounded">
                  <span className="font-medium text-blue-700">• </span>
                  <span>{pattern}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Correlaciones */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Correlaciones Detectadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.geminiInsights.correlations && stats.geminiInsights.correlations.map((correlation, index) => (
                <div key={index} className="bg-green-50 p-3 rounded">
                  <span className="font-medium text-green-700">• </span>
                  <span>{correlation}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tendencias Temporales */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Tendencias Temporales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.geminiInsights.temporalTrends && stats.geminiInsights.temporalTrends.map((trend, index) => (
                <div key={index} className="bg-purple-50 p-3 rounded">
                  <span className="font-medium text-purple-700">• </span>
                  <span>{trend}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Recomendaciones */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Recomendaciones</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.geminiInsights.recommendations && stats.geminiInsights.recommendations.map((recommendation, index) => (
                <div key={index} className="bg-yellow-50 p-3 rounded">
                  <span className="font-medium text-yellow-700">• </span>
                  <span>{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Análisis de Respuestas */}
          {stats.geminiInsights.responseAnalysis && stats.geminiInsights.responseAnalysis.keyInsights && stats.geminiInsights.responseAnalysis.keyInsights.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Análisis de Respuestas de Usuarios</h3>
              
              {/* Insights Clave */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Insights Clave</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.geminiInsights.responseAnalysis.keyInsights.map((insight, index) => (
                    <div key={index} className="bg-indigo-50 p-3 rounded">
                      <span className="font-medium text-indigo-700">• </span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Patrones Comunes */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Patrones Comunes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.geminiInsights.responseAnalysis.commonPatterns.map((pattern, index) => (
                    <div key={index} className="bg-teal-50 p-3 rounded">
                      <span className="font-medium text-teal-700">• </span>
                      <span>{pattern}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Acciones Recomendadas */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Acciones Recomendadas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.geminiInsights.responseAnalysis.recommendedActions.map((action, index) => (
                    <div key={index} className="bg-rose-50 p-3 rounded">
                      <span className="font-medium text-rose-700">• </span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sección de información adicional */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Análisis de la Efectividad</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded">
            <h3 className="font-semibold text-blue-700">Efectividad de la Herramienta</h3>
            <p className="mt-2">Un {stats.efectividad.porcentaje_mejora}% de los usuarios reporta mejoría en sus niveles de ansiedad después de usar la app por más de 1 mes.</p>
          </div>
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-semibold text-green-700">Retención de Usuarios</h3>
            <p className="mt-2">Los usuarios continúan usando la aplicación durante un promedio de {stats.retencion.promedio_meses_uso} meses, con un {stats.retencion.tasa_retencion}% de tasa de retención mensual.</p>
          </div>
          <div className="p-4 bg-purple-50 rounded">
            <h3 className="font-semibold text-purple-700">Patrones de Uso</h3>
            <p className="mt-2">
              {stats.patronesUso && stats.patronesUso.length > 0 && stats.patronesUso[0]?.hora !== undefined
                ? `Las horas de mayor actividad son alrededor de las ${stats.patronesUso[0].hora}:00, con un incremento significativo en el uso durante esas horas.` 
                : "No hay suficientes datos para determinar patrones de uso claros."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Nota de precaución */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <span className="font-medium">Nota importante:</span> Este dashboard muestra análisis estadísticos y no debe utilizarse para diagnósticos clínicos. Serenity no reemplaza la atención profesional de salud mental.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}