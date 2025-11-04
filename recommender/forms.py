from django import forms
from .models import Rating


class RatingForm(forms.ModelForm):
    rating = forms.FloatField(
        min_value=1.0,
        max_value=5.0,
        widget=forms.NumberInput(attrs={
            'step': '0.5',
            'min': '1.0',
            'max': '5.0',
            'class': 'form-control'
        })
    )
    
    class Meta:
        model = Rating
        fields = ['rating']
