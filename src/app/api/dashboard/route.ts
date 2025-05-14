import { NextResponse } from 'next/server';
import { executeQuery } from '../../../../lib/db';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Tipos para las estructuras de datos
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

interface AgeDistributionPoint {
    name: string;
    count: number;
}

interface MonthlyData {
    month: string;
    name: string;
    usuarios: number;
    tests: number;
}

interface MessageActivity {
    dia: string;
    mensajes: number;
    chatbots: number;
}

interface CorrelationData {
    score: string;
    promedio_mensajes: number;
}

interface Efectividad {
    total_usuarios?: number;
    mejoraron?: number;
    porcentaje_mejora: number;
}

interface Retencion {
    promedio_meses_uso: number;
    usuarios_activos_este_mes?: number;
    usuarios_activos_mes_anterior?: number;
    tasa_retencion: number;
}

interface PatronUso {
    hora: number;
    mensajes: number;
}

interface ChatAnalytic {
    chat_id: number;
    chat_name: string;
    user_gender: string | null;
    user_age: number | null;
    message_count: number;
    max_ansiedad: number | null;
    max_depresion: number | null;
}

interface RespuestaExtra {
    respuestas_extra: string;
}

interface RawData {
    userStats: UserStats;
    anxietyLevels: DataPoint[];
    depressionLevels: DataPoint[];
    ageDistribution: AgeDistributionPoint[];
    genderDistribution: DataPoint[];
    monthlyActivity: MonthlyData[];
    messageActivity: MessageActivity[];
    correlationData: CorrelationData[];
    efectividad: Efectividad;
    retencion: Retencion;
    patronesUso: PatronUso[];
    respuestasExtra: RespuestaExtra[];
    chatAnalytics: ChatAnalytic[];
}

// Interfaces para los resultados de los agentes de Gemini
interface ResponseAnalysis {
    commonPatterns: string[];
    keyInsights: string[];
    recommendedActions: string[];
}

interface GeminiInsights {
    effectiveness: { insight: string; score: number };
    significantPatterns: string[];
    correlations: string[];
    temporalTrends: string[];
    recommendations: string[];
    responseAnalysis: ResponseAnalysis;
}

interface EnhancedData extends RawData {
    geminiInsights: GeminiInsights;
}

// Configurar la API de Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function GET() {
    try {
        // Recopilar datos brutos de la base de datos
        const rawData = await collectRawData();

        // Analizar datos con Gemini
        const enhancedData = await analyzeDataWithGeminiAgents(rawData);

        // Devolver los datos procesados
        return NextResponse.json({
            success: true,
            stats: enhancedData
        });
    } catch (error) {
        console.error('Error al procesar datos del dashboard:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}

async function collectRawData(): Promise<RawData> {
    // Obtener estadísticas generales
    const userCount = await executeQuery('SELECT COUNT(*) as total FROM users');
    const newUsersThisMonth = await executeQuery(`
        SELECT COUNT(*) as total 
        FROM users 
        WHERE created_at >= DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01')
    `);

    const testCount = await executeQuery('SELECT COUNT(*) as total FROM resultados_test');
    const messageCount = await executeQuery('SELECT COUNT(*) as total FROM chat_messages');

    // Distribución de niveles de ansiedad
    const anxietyLevels = await executeQuery(`
        SELECT 
            ansiedad_interpretacion as name, 
            COUNT(*) as value 
        FROM 
            resultados_test 
        WHERE 
            ansiedad_interpretacion IS NOT NULL 
        GROUP BY 
            ansiedad_interpretacion
    `);

    // Distribución de niveles de depresión
    const depressionLevels = await executeQuery(`
        SELECT 
            depresion_interpretacion as name, 
            COUNT(*) as value 
        FROM 
            resultados_test 
        WHERE 
            depresion_interpretacion IS NOT NULL 
        GROUP BY 
            depresion_interpretacion
    `);

    // Distribución por edad (agrupada en rangos)
    const ageDistribution = await executeQuery(`
        SELECT 
            CASE 
                WHEN age < 18 THEN 'Menor de 18'
                WHEN age BETWEEN 18 AND 24 THEN '18-24'
                WHEN age BETWEEN 25 AND 34 THEN '25-34'
                WHEN age BETWEEN 35 AND 44 THEN '35-44'
                WHEN age BETWEEN 45 AND 54 THEN '45-54'
                WHEN age >= 55 THEN '55+'
                ELSE 'No especificado'
            END as name,
            COUNT(*) as count
        FROM 
            users
        WHERE 
            age IS NOT NULL
        GROUP BY 
            name
        ORDER BY 
            FIELD(name, 'Menor de 18', '18-24', '25-34', '35-44', '45-54', '55+', 'No especificado')
    `);

    // Distribución por género
    const genderDistribution = await executeQuery(`
        SELECT 
            IFNULL(gender, 'No especificado') as name, 
            COUNT(*) as value 
        FROM 
            users 
        GROUP BY 
            gender
    `);

    // Actividad mensual (últimos 6 meses)
    const monthlyUsers = await executeQuery(`
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            DATE_FORMAT(created_at, '%b') as name,
            COUNT(*) as usuarios
        FROM 
            users
        WHERE 
            created_at >= NOW() - INTERVAL 6 MONTH
        GROUP BY 
            month, name
        ORDER BY 
            month ASC
    `);

    // Obtener recuento de tests por mes para el mismo período
    const monthlyTests = await executeQuery(`
        SELECT 
            DATE_FORMAT(fecha, '%Y-%m') as month,
            COUNT(*) as tests
        FROM 
            resultados_test
        WHERE 
            fecha >= NOW() - INTERVAL 6 MONTH
        GROUP BY 
            month
        ORDER BY 
            month ASC
    `);

    // Combinamos los datos de usuarios y tests por mes
    const combinedMonthlyData: MonthlyData[] = monthlyUsers.map((month: { month: any; }) => {
        const matchingTests = monthlyTests.find((test: { month: any; }) => test.month === month.month);
        return {
            ...month,
            tests: matchingTests ? matchingTests.tests : 0
        };
    });

    // Actividad de mensajes (última semana)
    const messageActivity = await executeQuery(`
        SELECT 
            DATE_FORMAT(created_at, '%a') as dia,
            COUNT(*) as mensajes,
            SUM(is_bot) as chatbots
        FROM 
            chat_messages
        WHERE 
            created_at >= NOW() - INTERVAL 7 DAY
        GROUP BY 
            dia
        ORDER BY 
            FIELD(dia, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')
    `);

    // Traducir días de la semana a español
    const diasTraducidos: Record<string, string> = {
        'Mon': 'Lun',
        'Tue': 'Mar',
        'Wed': 'Mié',
        'Thu': 'Jue',
        'Fri': 'Vie',
        'Sat': 'Sáb',
        'Sun': 'Dom'
    };

    const messageActivityTranslated: MessageActivity[] = messageActivity.map((day: { dia: string | number; }) => ({
        ...day,
        dia: diasTraducidos[day.dia] || day.dia
    }));

    // Correlación entre scores de ansiedad y uso (promedio de mensajes)
    const correlationData = await executeQuery(`
        SELECT 
            CASE 
                WHEN rt.ansiedad_score BETWEEN 0 AND 5 THEN '0-5'
                WHEN rt.ansiedad_score BETWEEN 6 AND 10 THEN '6-10'
                WHEN rt.ansiedad_score BETWEEN 11 AND 15 THEN '11-15'
                WHEN rt.ansiedad_score BETWEEN 16 AND 20 THEN '16-20'
                WHEN rt.ansiedad_score > 20 THEN '21+'
                ELSE 'No disponible'
            END as score,
            AVG(message_count) as promedio_mensajes
        FROM 
            resultados_test rt
        JOIN (
            SELECT 
                c.user_id,
                COUNT(cm.id) as message_count
            FROM 
                chats c
            JOIN 
                chat_messages cm ON c.id = cm.chat_id
            GROUP BY 
                c.user_id
        ) as message_data ON rt.usuario_id = message_data.user_id
        WHERE 
            rt.ansiedad_score IS NOT NULL
        GROUP BY 
            score
        ORDER BY 
            MIN(rt.ansiedad_score)
    `);

    // Efectividad de la herramienta (comparando scores iniciales vs más recientes)
    const efectividad = await executeQuery(`
        WITH user_tests AS (
            SELECT 
                usuario_id,
                MIN(fecha) as primera_fecha,
                MAX(fecha) as ultima_fecha
            FROM 
                resultados_test
            GROUP BY 
                usuario_id
            HAVING 
                DATEDIFF(ultima_fecha, primera_fecha) >= 30
        ),
        scores AS (
            SELECT 
                ut.usuario_id,
                first_test.ansiedad_score as primer_score,
                last_test.ansiedad_score as ultimo_score
            FROM 
                user_tests ut
            JOIN 
                resultados_test first_test ON ut.usuario_id = first_test.usuario_id AND ut.primera_fecha = first_test.fecha
            JOIN 
                resultados_test last_test ON ut.usuario_id = last_test.usuario_id AND ut.ultima_fecha = last_test.fecha
        )
        SELECT 
            COUNT(*) as total_usuarios,
            SUM(CASE WHEN ultimo_score < primer_score THEN 1 ELSE 0 END) as mejoraron,
            ROUND(SUM(CASE WHEN ultimo_score < primer_score THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) as porcentaje_mejora
        FROM 
            scores
    `);

    // Retención de usuarios (promedio de tiempo de uso y tasa de retención)
    const retencion = await executeQuery(`
        WITH user_activity AS (
            SELECT 
                users.id,
                MIN(users.created_at) as primera_actividad,
                GREATEST(
                    MAX(users.updated_at), 
                    IFNULL(MAX(chats.updated_at), '1970-01-01'), 
                    IFNULL(MAX(rt.fecha), '1970-01-01')
                ) as ultima_actividad
            FROM 
                users
            LEFT JOIN 
                chats ON users.id = chats.user_id
            LEFT JOIN 
                resultados_test rt ON users.id = rt.usuario_id
            GROUP BY 
                users.id
        ),
        meses_uso AS (
            SELECT 
                id,
                TIMESTAMPDIFF(MONTH, primera_actividad, ultima_actividad) as meses
            FROM 
                user_activity
        ),
        usuarios_mes_anterior AS (
            SELECT 
                COUNT(*) as total
            FROM 
                user_activity
            WHERE 
                ultima_actividad >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
        ),
        usuarios_este_mes AS (
            SELECT 
                COUNT(*) as total
            FROM 
                user_activity
            WHERE 
                ultima_actividad >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        )
        SELECT 
            ROUND(AVG(meses), 1) as promedio_meses_uso,
            (SELECT total FROM usuarios_este_mes) as usuarios_activos_este_mes,
            (SELECT total FROM usuarios_mes_anterior) as usuarios_activos_mes_anterior,
            ROUND((SELECT total FROM usuarios_este_mes) / (SELECT total FROM usuarios_mes_anterior) * 100, 1) as tasa_retencion
        FROM 
            meses_uso
    `);

    // Patrones de uso (horas y días de mayor actividad)
    const patronesUso = await executeQuery(`
        SELECT 
            HOUR(created_at) as hora,
            COUNT(*) as mensajes
        FROM 
            chat_messages
        WHERE 
            created_at >= NOW() - INTERVAL 30 DAY
        GROUP BY 
            hora
        ORDER BY 
            mensajes DESC
        LIMIT 3
    `);

    // Obtener datos de respuestas_extra para analizar con Gemini
    const respuestasExtra = await executeQuery(`
        SELECT respuestas_extra
        FROM resultados_test
        WHERE respuestas_extra IS NOT NULL
        LIMIT 100
    `);

    // Recopilar datos sobre chats de mayor duración y posibles correlaciones
    const chatAnalytics = await executeQuery(`
        SELECT 
            c.id as chat_id,
            c.name as chat_name,
            u.gender as user_gender,
            u.age as user_age,
            COUNT(cm.id) as message_count,
            MAX(rt.ansiedad_score) as max_ansiedad,
            MAX(rt.depresion_score) as max_depresion
        FROM 
            chats c
        JOIN 
            users u ON c.user_id = u.id
        JOIN 
            chat_messages cm ON c.id = cm.chat_id
        LEFT JOIN 
            resultados_test rt ON u.id = rt.usuario_id
        GROUP BY 
            c.id, c.name, u.gender, u.age
        ORDER BY 
            message_count DESC
        LIMIT 50
    `);

    // Devolver todos los datos brutos recopilados
    return {
        userStats: {
            total: userCount[0]?.total || 0,
            nuevos_este_mes: newUsersThisMonth[0]?.total || 0,
            tests_totales: testCount[0]?.total || 0,
            mensajes_totales: messageCount[0]?.total || 0
        },
        anxietyLevels,
        depressionLevels,
        ageDistribution,
        genderDistribution,
        monthlyActivity: combinedMonthlyData,
        messageActivity: messageActivityTranslated,
        correlationData,
        efectividad: efectividad[0] || { porcentaje_mejora: 0 },
        retencion: retencion[0] || { promedio_meses_uso: 0, tasa_retencion: 0 },
        patronesUso,
        respuestasExtra,
        chatAnalytics
    };
}

// Función para ejecutar un agente de Gemini específico
async function runGeminiAgent<T>(
    model: GenerativeModel,
    agentName: string,
    data: object,
    systemPrompt: string
): Promise<T> {
    try {
        console.log(`🤖 Ejecutando agente de Gemini: ${agentName}`);

        // Crear la consulta que el agente formulará basada en los datos
        const formulationPrompt = `
        ${systemPrompt}
        
        Datos disponibles para análisis:
        ${JSON.stringify(data, null, 2)}
        
        Tu tarea es:
        1. Analizar estos datos en profundidad como un experto en salud mental y análisis de datos
        2. Formular tus propias consultas basadas en estos datos
        3. Generar insights significativos que puedan ayudar a mejorar la aplicación Serenity
        4. Organizar tu respuesta según la estructura especificada
        
        Recuerda que tu objetivo es descubrir patrones no evidentes y proporcionar recomendaciones accionables.
        `;

        // Ejecutar la consulta
        const result = await model.generateContent(formulationPrompt);
        const response = await result.response;
        let analysisText = response.text();

        // Extraer el JSON de la respuesta (eliminar markdown si existe)
        analysisText = analysisText.replace(/```json|```/g, '').trim();

        try {
            return JSON.parse(analysisText) as T;
        } catch (e) {
            console.error(`Error al analizar respuesta JSON del agente ${agentName}:`, e);

            // Intentar extraer solo la parte JSON de la respuesta
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]) as T;
                } catch (nestedError) {
                    console.error(`Segundo intento fallido para ${agentName}:`, nestedError);
                    throw new Error(`El agente ${agentName} no generó JSON válido`);
                }
            }

            throw new Error(`El agente ${agentName} no generó JSON válido`);
        }
    } catch (error) {
        console.error(`Error en el agente ${agentName}:`, error);
        throw error;
    }
}

async function analyzeDataWithGeminiAgents(rawData: RawData): Promise<EnhancedData> {
    try {
        // Inicializar el modelo de Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Preparar datos para todos los agentes
        const dataForAgents = {
            userStats: rawData.userStats,
            anxietyDistribution: rawData.anxietyLevels,
            depressionDistribution: rawData.depressionLevels,
            demographics: {
                age: rawData.ageDistribution,
                gender: rawData.genderDistribution
            },
            activityPatterns: {
                monthly: rawData.monthlyActivity,
                weekly: rawData.messageActivity
            },
            correlationData: rawData.correlationData,
            effectiveness: rawData.efectividad,
            retention: rawData.retencion,
            usagePatterns: rawData.patronesUso,
            chatAnalytics: rawData.chatAnalytics
        };

        // Ejecutar todos los agentes en paralelo
        const [
            effectivenessAnalysis,
            significantPatternsAnalysis,
            correlationsAnalysis,
            temporalTrendsAnalysis,
            recommendationsAnalysis,
            responseAnalysis
        ] = await Promise.all([
            // Agente 1: Analista de Efectividad
            runGeminiAgent<{ insight: string; score: number }>(
                model,
                "AnalisisEfectividad",
                { efectividad: rawData.efectividad, correlationData: rawData.correlationData },
                `Eres un experto en análisis de efectividad de aplicaciones de salud mental. 
                Tu especialidad es evaluar cómo las aplicaciones están ayudando a usuarios con ansiedad y depresión.
                Debes proporcionar un análisis profundo de cuán efectiva es la app Serenity basándote en los datos.
                Devuelve un JSON con las siguientes propiedades:
                - insight: Una cadena de texto con el principal insight sobre la efectividad de la app
                - score: Un número entre 0 y 100 que representa tu evaluación de la efectividad general de la app`
            ),

            // Agente 2: Analista de Patrones
            runGeminiAgent<string[]>(
                model,
                "AnalisisPatrones",
                {
                    anxietyLevels: rawData.anxietyLevels,
                    depressionLevels: rawData.depressionLevels,
                    ageDistribution: rawData.ageDistribution,
                    genderDistribution: rawData.genderDistribution
                },
                `Eres un científico de datos especializado en detectar patrones en datos de aplicaciones de salud mental.
                Tu trabajo es identificar patrones significativos en la distribución de usuarios y sus niveles de ansiedad/depresión.
                Devuelve un JSON que sea un array de strings, donde cada string describe un patrón significativo que hayas detectado.
                Limita tu respuesta a máximo 6 patrones realmente relevantes.`
            ),

            // Agente 3: Analista de Correlaciones
            runGeminiAgent<string[]>(
                model,
                "AnalisisCorrelaciones",
                {
                    correlationData: rawData.correlationData,
                    chatAnalytics: rawData.chatAnalytics,
                    patronesUso: rawData.patronesUso
                },
                `Eres un estadístico especializado en encontrar correlaciones entre el uso de aplicaciones y resultados de salud mental.
                Tu misión es encontrar relaciones entre cómo los usuarios utilizan la aplicación Serenity y sus niveles de ansiedad/depresión.
                Devuelve un JSON que sea un array de strings, donde cada string describe una correlación importante que hayas detectado.
                Limita tu respuesta a máximo 6 correlaciones realmente significativas.`
            ),

            // Agente 4: Analista de Tendencias
            runGeminiAgent<string[]>(
                model,
                "AnalisisTendencias",
                {
                    monthlyActivity: rawData.monthlyActivity,
                    messageActivity: rawData.messageActivity
                },
                `Eres un analista de tendencias en aplicaciones de salud digital.
                Tu especialidad es identificar patrones temporales, crecimiento y posibles tendencias futuras.
                Analiza cómo ha evolucionado el uso de la aplicación Serenity a lo largo del tiempo.
                Devuelve un JSON que sea un array de strings, donde cada string describe una tendencia temporal importante.
                Limita tu respuesta a máximo 6 tendencias realmente relevantes.`
            ),

            // Agente 5: Consultor de Recomendaciones
            runGeminiAgent<string[]>(
                model,
                "AnalisisRecomendaciones",
                dataForAgents,
                `Eres un consultor estratégico para aplicaciones de salud mental.
                Tu trabajo es proporcionar recomendaciones accionables para mejorar la app Serenity basándote en todos los datos disponibles.
                Devuelve un JSON que sea un array de strings, donde cada string es una recomendación específica y accionable.
                Limita tu respuesta a máximo 6 recomendaciones realmente importantes y efectivas.`
            ),

            // Agente 6: Analista de Respuestas Cualitativas
            runGeminiAgent<ResponseAnalysis>(
                model,
                "AnalisisRespuestas",
                { respuestasExtra: rawData.respuestasExtra },
                `Eres un psicólogo especializado en análisis cualitativo de respuestas de pacientes.
                Tu objetivo es analizar las respuestas textuales de los usuarios en sus tests de ansiedad y depresión.
                Busca patrones comunes, insights clave y recomienda acciones basadas en el contenido textual.
                Devuelve un JSON con la siguiente estructura:
                {
                  "commonPatterns": [array de strings con patrones comunes detectados],
                  "keyInsights": [array de strings con insights clave],
                  "recommendedActions": [array de strings con acciones recomendadas]
                }
                Limita cada array a un máximo de 4-5 elementos realmente significativos.`
            )
        ]);

        // Integrar todos los análisis en un resultado final para que coincida con la estructura esperada por el frontend
        return {
            ...rawData,
            geminiInsights: {
                effectiveness: effectivenessAnalysis,
                significantPatterns: significantPatternsAnalysis,
                correlations: correlationsAnalysis,
                temporalTrends: temporalTrendsAnalysis,
                recommendations: recommendationsAnalysis,
                responseAnalysis: responseAnalysis
            }
        };
    } catch (error) {
        console.error('Error al procesar con agentes de Gemini:', error);

        // En caso de error, devolver los datos originales con una estructura básica para geminiInsights
        return {
            ...rawData,
            geminiInsights: {
                effectiveness: { insight: "Error al analizar efectividad", score: 0 },
                significantPatterns: ["Error al analizar patrones"],
                correlations: ["Error al analizar correlaciones"],
                temporalTrends: ["Error al analizar tendencias"],
                recommendations: ["Error al generar recomendaciones"],
                responseAnalysis: {
                    commonPatterns: [],
                    keyInsights: ["Error al analizar respuestas"],
                    recommendedActions: []
                }
            }
        };
    }
}