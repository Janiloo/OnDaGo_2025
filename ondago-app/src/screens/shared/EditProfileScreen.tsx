import React, { useState } from "react";
import { Alert } from "react-native";
import { Button, Field, Screen, Subtitle, Title } from "../../components/UI";
import { editProfile } from "../../services/authApi";
import { errorMessage } from "../../services/client";
import { useAuth } from "../../store/AuthContext";

/** Edit name/phone → PUT /api/Users/edit-profile. */
export default function EditProfileScreen({ navigation, route }: any) {
  const { updateUser } = useAuth();
  const [name, setName] = useState<string>(route.params?.name ?? "");
  const [phoneNumber, setPhoneNumber] = useState<string>(route.params?.phoneNumber ?? "");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      await editProfile(name.trim(), phoneNumber.trim());
      updateUser({ name: name.trim(), phoneNumber: phoneNumber.trim() });
      Alert.alert("Saved", "Your profile was updated.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Update failed", errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Edit profile</Title>
      <Subtitle>Update your name and phone number.</Subtitle>
      <Field label="Full Name" icon="person-outline" value={name} onChangeText={setName} />
      <Field
        label="Phone Number"
        icon="call-outline"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <Button title="Save Changes" icon="checkmark" onPress={save} loading={loading} />
    </Screen>
  );
}
