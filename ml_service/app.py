# ==============================================================================
# 🌐 app.py - SERVICIO FASTAPI PARA INFERENCIA MULTICLASE (PERFILES DIETÉTICOS PAM)
# ✅ Robusto: Detecta clases dinámicamente + Compatible con LabelEncoder + Logging
# ==============================================================================
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf
from keras.models import load_model
import pandas as pd
import numpy as np
import joblib
import uvicorn
from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, Dict, List
from contextlib import asynccontextmanager
import logging
import json

# Configuración de logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

# Variables globales
model = None
preprocessor = None
NUM_CLASSES = None
PROFILE_NAMES = None

# ==============================================================================
# 📋 CONFIGURACIÓN DINÁMICA DE PERFILES (Se carga desde archivo de mapeo)
# ==============================================================================
DEFAULT_PROFILE_CONFIG = {
    "names": {
        0: 'Hipocalorico', 
        1: 'Control Glucemico', 
        2: 'Hipo-grasa', 
        3: 'Normocalorico'
    },
    "descriptions": {
        0: 'Enfocado en reducción calorica para perdida de peso (IMC ≥25).',
        1: 'Control de ingesta de carbohidratos para estabilidad glucemica.',
        2: 'Reducción de lipidos para pacientes con dislipidemia o higado graso.',
        3: 'Dieta equilibrada para mantenimiento de peso y salud metabolica.'
    },
    "recommendations": {
        0: 'Priorizar alimentos bajos en calorias y alta densidad nutricional. Evitar azucares simples.',
        1: 'Controlar porciones de carbohidratos. Preferir alimentos de indice glucemico bajo.',
        2: 'Reducir grasas saturadas y trans. Aumentar fibra soluble y acidos grasos omega-3.',
        3: 'Mantener equilibrio de macronutrientes. Enfocarse en habitos sostenibles a largo plazo.'
    }
}

def load_profile_config(base_dir: Path) -> Dict:
    """Carga configuración de perfiles desde archivo o usa valores por defecto"""
    config_path = base_dir / "profile_config.json"
    if config_path.exists():
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                # ✅ CRÍTICO: Convertir claves de string a int para consistencia
                return {
                    "names": {int(k): v for k, v in config.get("names", {}).items()},
                    "descriptions": {int(k): v for k, v in config.get("descriptions", {}).items()},
                    "recommendations": {int(k): v for k, v in config.get("recommendations", {}).items()},
                    "num_classes": config.get("num_classes", 4)
                }
        except Exception as e:
            logger.warning(f"⚠️ No se pudo cargar profile_config.json: {e}. Usando valores por defecto.")
    # Valores por defecto con claves ENTERO (no string)
    return DEFAULT_PROFILE_CONFIG

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carga recursos al iniciar el servicio"""
    global model, preprocessor, NUM_CLASSES, PROFILE_NAMES, PROFILE_DESC, RECOMMENDATIONS
    
    logger.info("🚀 Iniciando Nutri-AI ML Service...")
    
    try:
        BASE_DIR = Path(__file__).parent
        
        # Cargar configuración de perfiles
        profile_config = load_profile_config(BASE_DIR)
        PROFILE_NAMES = profile_config.get("names", DEFAULT_PROFILE_CONFIG["names"])
        PROFILE_DESC = profile_config.get("descriptions", DEFAULT_PROFILE_CONFIG["descriptions"])
        RECOMMENDATIONS = profile_config.get("recommendations", DEFAULT_PROFILE_CONFIG["recommendations"])
        
        # Cargar preprocesador
        PREPROCESSOR_PATH = BASE_DIR / "preprocessor.pkl"
        if PREPROCESSOR_PATH.exists():
            preprocessor = joblib.load(PREPROCESSOR_PATH)
            logger.info("✅ Preprocesador cargado")
        else:
            logger.error("❌ Preprocesador no encontrado")
            raise FileNotFoundError("preprocessor.pkl no existe")
            
        # Cargar modelo
        MODEL_PATH = BASE_DIR / "mlp_perfiles_pam_tf.keras"
        if MODEL_PATH.exists():
            model = load_model(str(MODEL_PATH))
            logger.info("✅ Modelo cargado")
            
            # ✅ Detectar número de clases dinámicamente desde el modelo
            NUM_CLASSES = model.output_shape[-1]
            logger.info(f"📊 Modelo configurado para {NUM_CLASSES} clases de salida")
            
            # Validar consistencia con configuración de perfiles
            if NUM_CLASSES > len(PROFILE_NAMES):
                logger.warning(f"⚠️ El modelo tiene {NUM_CLASSES} clases pero solo hay {len(PROFILE_NAMES)} nombres definidos")
                # Extender PROFILE_NAMES con nombres genéricos si es necesario
                for i in range(len(PROFILE_NAMES), NUM_CLASSES):
                    PROFILE_NAMES[i] = f'Perfil_{i}'
                    PROFILE_DESC[i] = f'Perfil dietético clase {i}'
                    RECOMMENDATIONS[i] = 'Consultar con especialista para detalles del plan.'
        else:
            logger.error("❌ Modelo no encontrado")
            raise FileNotFoundError("mlp_perfiles_pam_tf.keras no existe")
            
    except Exception as e:
        logger.error(f"❌ Error crítico cargando recursos: {e}")
        raise
    
    yield
    logger.info("🛑 Cerrando servicio...")

app = FastAPI(
    title="Nutri-AI ML Service",
    description="Clasificación de perfiles dietéticos PAM mediante red neuronal para pacientes con diabetes tipo 2",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# 📦 MODELOS DE ENTRADA/SALIDA (Pydantic)
# ==============================================================================
class PrediccionRequest(BaseModel):
    imc: Optional[float] = Field(None, ge=10, le=60, description="Índice de Masa Corporal")
    edad: Optional[int] = Field(None, ge=0, le=120, description="Edad del paciente en años")
    genero: Optional[Literal['M', 'F']] = Field(None, description="Género: M=Masculino, F=Femenino")

    @field_validator('imc')
    @classmethod
    def validate_imc(cls, v):
        if v is not None and (np.isnan(v) or np.isinf(v)):
            return None
        return v

class PrediccionResponse(BaseModel):
    perfil_id: int
    perfil_nombre: str
    confianza: float
    probabilidades: Dict[str, float]
    explicacion: str
    recomendacion: Optional[str] = None
    incertidumbre: Optional[str] = None

# ==============================================================================
# 🔌 ENDPOINTS
# ==============================================================================
@app.get("/health")
async def health_check():
    """Verifica estado del servicio"""
    return {
        "status": "healthy" if model is not None and preprocessor is not None else "degraded",
        "model_loaded": model is not None,
        "preprocessor_loaded": preprocessor is not None,
        "framework": f"TensorFlow {tf.__version__}",
        "num_classes": NUM_CLASSES,
        "model_type": "multiclass_pam_profiles"
    }

@app.post("/prediccion-perfil", response_model=PrediccionResponse)
async def predecir_perfil(req: PrediccionRequest):
    """
    Endpoint principal: recibe datos clínicos y retorna perfil dietético sugerido.
    
    Entrada: IMC, edad, género
    Salida: Perfil PAM con probabilidades, explicación clínica y recomendación
    """
    if model is None or preprocessor is None:
        raise HTTPException(status_code=503, detail="Modelo o preprocesador no cargado")
    
    try:
        # 1. Preparar input
        df_input = pd.DataFrame([{
            'imc': req.imc,
            'edad': req.edad,
            'genero': req.genero
        }])
        
        # 2. Aplicar preprocesamiento (MISMO pipeline que en entrenamiento)
        X_processed = preprocessor.transform(df_input)
        
        # 3. Inferencia MULTICLASE: logits → softmax → probabilidades
        logits = model.predict(X_processed, verbose=0)
        probs = tf.nn.softmax(logits, axis=1).numpy()[0]  # Extraer primera fila
        
        # 4. Extraer predicción (usar NUM_CLASSES dinámico)
        pred_id = int(np.argmax(probs))
        confianza = float(probs[pred_id])
        
        # ✅ Iterar solo sobre las clases reales del modelo
        probabilidades = {
            PROFILE_NAMES.get(i, f'Clase_{i}'): round(float(probs[i]), 4) 
            for i in range(NUM_CLASSES)
        }
        
        # 5. Calcular incertidumbre (entropía de la distribución)
        entropia = -np.sum(probs * np.log(probs + 1e-10))
        # Umbral ajustado para multiclase: máxima entropía = ln(NUM_CLASSES)
        max_entropia = np.log(NUM_CLASSES)
        entropia_norm = entropia / max_entropia if max_entropia > 0 else 0
        incertidumbre = "alta" if entropia_norm > 0.7 else "media" if entropia_norm > 0.4 else "baja"
        
        # 6. Generar explicación clínica contextualizada
        perfil_nombre = PROFILE_NAMES.get(pred_id, f'Perfil_{pred_id}')
        perfil_desc = PROFILE_DESC.get(pred_id, f'Perfil dietético clase {pred_id}')
        
        explicacion = f"Perfil sugerido: {perfil_nombre}. {perfil_desc} "
        
        # Factores clínicos adicionales
        if req.imc:
            if req.imc >= 30:
                explicacion += "IMC indica obesidad. "
            elif req.imc >= 25:
                explicacion += "IMC indica sobrepeso. "
            elif req.imc < 18.5:
                explicacion += "IMC indica bajo peso. "
        
        if req.edad and req.edad > 50:
            explicacion += "Edad considerada como factor de riesgo metabólico. "
        
        # Alerta por confianza baja
        if confianza < 0.60:
            explicacion += f"⚠️ Confianza moderada ({confianza:.2%}). Validación clínica recomendada."
        
        # 7. Log para auditoría
        logger.info(f"Predicción: IMC={req.imc}, Edad={req.edad}, Género={req.genero} → "
                   f"{perfil_nombre} (conf={confianza:.2%}, incert={incertidumbre})")
        
        return PrediccionResponse(
            perfil_id=pred_id,
            perfil_nombre=perfil_nombre,
            confianza=round(confianza, 4),
            probabilidades=probabilidades,
            explicacion=explicacion.strip(),
            recomendacion=RECOMMENDATIONS.get(pred_id, "Consultar con especialista."),
            incertidumbre=incertidumbre
        )
        
    except Exception as e:
        logger.error(f"❌ Error en predicción: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno del servicio: {str(e)}")

@app.get("/model-info")
async def model_info():
    """Información técnica del modelo para documentación"""
    if model is None:
        return {"error": "Modelo no cargado"}
    
    return {
        "model_version": "1.0.0",
        "framework": f"TensorFlow {tf.__version__}",
        "input_shape": list(model.input_shape),
        "output_classes": NUM_CLASSES,
        "profile_names": {str(k): v for k, v in PROFILE_NAMES.items()},
        "profile_descriptions": {str(k): v for k, v in PROFILE_DESC.items()},
        "features_used": ["imc", "edad", "genero"],
        "training_date": "2026-05-15",
        "model_type": "multiclass_classification_pam_profiles",
        "architecture": "MLP [Input→64→32→N] + BatchNorm + ReLU + Dropout",
        "preprocessor_features": preprocessor.get_feature_names_out() if hasattr(preprocessor, 'get_feature_names_out') else "StandardScaler + OneHotEncoder"
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8001, reload=True)