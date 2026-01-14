import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext'; 
import { API_URL } from '@/constants/Config';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth(); 
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    Keyboard.dismiss();

    try {
      setLoading(true);
      console.log('1. Logging in...');

      // Step 1: ยิง Login ปกติเพื่อเอา Token
      const response = await fetch(`${API_URL}/auth/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier,
          password: password,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }
      
      const jwt = data.jwt;
      const userId = data.user.id;

      // ⭐⭐⭐ Step 2: (เพิ่มใหม่) ใช้ Token ไปดึงข้อมูล User ตัวเต็ม (พร้อม Avatar)
      console.log('2. Fetching full profile with avatar...');
      const fullProfileRes = await fetch(`${API_URL}/users/${userId}?populate=avatar`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!fullProfileRes.ok) {
        // ถ้าดึงรูปไม่ได้ ให้ใช้ข้อมูลเดิมไปก่อน กันแอปพัง
        console.log('Failed to fetch full profile, using basic data');
        await login(jwt, data.user);
      } else {
        const fullUser = await fullProfileRes.json();
        console.log('>> Full User Data:', JSON.stringify(fullUser, null, 2));
        
        // ⭐ บันทึกข้อมูลตัวเต็ม (มี Avatar) ลงเครื่อง
        await login(jwt, fullUser);
      }

      router.replace('/'); 

    } catch (error: any) {
      console.error('Login Error:', error);
      Alert.alert('เข้าระบบไม่สำเร็จ', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>ยินดีต้อนรับ</Text>
            <Text style={styles.subtitle}>ระบบเบิก-จ่าย อุปกรณ์ก่อสร้าง</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ชื่อผู้ใช้ หรือ อีเมล</Text>
              <TextInput 
                style={styles.input} 
                placeholder="กรอกชื่อผู้ใช้..." 
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none" 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>รหัสผ่าน</Text>
              <TextInput 
                style={styles.input} 
                placeholder="กรอกรหัสผ่าน..." 
                value={password}
                onChangeText={setPassword}
                secureTextEntry 
              />
            </View>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00796B',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center', 
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  loginButton: {
    backgroundColor: '#004D40',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});