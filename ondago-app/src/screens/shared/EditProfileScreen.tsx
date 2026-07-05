import React, { useState } from "react";
import { Button, Field, Screen, Subtitle, Title } from "../../components/UI";
import { editProfile } from "../../services/authApi";
import { errorMessage } from "../../services/client";
import { useAuth } from "../../store/AuthContext";
import { useToast } from "../../components/Toast";

/** Edit name/phone → PUT /api/Users/edit-profile. */
export default function EditProfileScreen({ navigation, route }: any) {
  const { updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState<string>(route.params?.name ?? "");
  const [phoneNumber, setPhoneNumber] = useState<string>(route.params?.phoneNumber ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      setNameError("Name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      await editProfile(name.trim(), phoneNumber.trim());
      updateUser({ name: name.trim(), phoneNumber: phoneNumber.trim() });
      // Toast lives above navigation, so it stays visible after we pop back.
      toast.success("Profile updated");
      navigation.goBack();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Edit profile</Title>
      <Subtitle>Update your name and phone number.</Subtitle>
      <Field
        label="Full Name"
        icon="person-outline"
        value={name}
        onChangeText={(t) => { setName(t); if (nameError) setNameError(undefined); }}
        error={nameError}
      />
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
