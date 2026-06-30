import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { signUpSchema, type SignUpInput } from '../../schemas/auth';
import { useGoogleSignIn, useSignUp } from '../../features/auth/hooks/useAuth';

export default function SignUp() {
  const router = useRouter();
  const signUp = useSignUp();
  const googleSignIn = useGoogleSignIn();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    signUp.mutate(values);
  });

  return (
    <Screen scroll>
      <View className="flex-1 justify-center gap-6">
        <View className="gap-1.5">
          <Text className="font-display text-2xl text-ink">Create your account</Text>
          <Text className="font-body text-base text-ink-muted">
            Start logging in under a minute.
          </Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                autoCapitalize="none"
                autoComplete="new-password"
                secureTextEntry
              />
            )}
          />
          {signUp.isError ? (
            <Text className="font-body-medium text-sm text-danger">
              {signUp.error instanceof Error ? signUp.error.message : 'Couldn’t sign up.'}
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <Button label="Create account" onPress={onSubmit} loading={signUp.isPending} />
          <Button
            label="Continue with Google"
            variant="secondary"
            onPress={() => googleSignIn.mutate()}
            loading={googleSignIn.isPending}
          />
          <Button
            label="Already have an account? Sign in"
            variant="ghost"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </View>
    </Screen>
  );
}
