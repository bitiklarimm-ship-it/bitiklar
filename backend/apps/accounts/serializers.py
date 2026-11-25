from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    can_submit = serializers.BooleanField(read_only=True)
    is_editor = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name", "role", "is_verified",
            "affiliation", "academic_degree", "orcid", "bio", "can_submit", "is_editor",
        )
        read_only_fields = ("role", "is_verified")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    as_researcher = serializers.BooleanField(write_only=True, default=False)

    class Meta:
        model = User
        fields = (
            "username", "email", "password", "first_name", "last_name",
            "affiliation", "academic_degree", "orcid", "as_researcher",
        )

    def create(self, validated_data):
        as_researcher = validated_data.pop("as_researcher", False)
        password = validated_data.pop("password")
        user = User(**validated_data)
        # Tadqiqotchi sifatida ro'yxatdan o'tganlar admin tasdig'ini kutadi
        user.role = User.Role.RESEARCHER if as_researcher else User.Role.READER
        user.is_verified = False
        user.set_password(password)
        user.save()
        return user
