
from xgboost import XGBClassifier
import joblib
def train(X,y):
    m=XGBClassifier(n_estimators=100,max_depth=6)
    m.fit(X,y)
    joblib.dump(m,'ml/ice_model.pkl')
