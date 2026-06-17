
import joblib
def predict(X):
    m=joblib.load('ml/ice_model.pkl')
    return m.predict_proba(X)[:,1]
