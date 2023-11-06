import React from 'react';
import loginImage from '@/assets/login.jpg';
import Swal from 'sweetalert2';
import { Button, Flex, Input } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { apiLogin } from '@/apis';
import icons from '@/utils/icons';

type LoginData = {
    email: string;
    password: string;
};
const SignIn: React.FC = () => {
    const { FaRegUser, HiOutlineLockClosed, FcGoogle, SiFacebook } = icons;
    const {
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm({
        defaultValues: {
            email: '',
            password: '',
        },
    });
    const loginMutation = useMutation({ mutationFn: apiLogin });
    const handleLogin = (data: LoginData) => {
        loginMutation.mutate(data, {
            onSuccess: (data) => {
                if (data) {
                    if (data.success) {
                        Swal.fire('Congratulation', 'Login successfully', 'success');
                        reset();
                    } else Swal.fire('Error', data?.message, 'error');
                } else {
                    Swal.fire('Error', 'Login failed', 'error');
                }
            },

            onError: (error) => {
                console.error('Login failed', error);
                Swal.fire('Error', 'Login failed', 'error');
            },
        });
        console.log(data);
    };
    return (
        <form onSubmit={handleSubmit(handleLogin)}>
            <div className="w-full flex gap-5">
                <div className="flex-1 pb-10 hidden lg:block">
                    <img src={loginImage} />
                </div>
                <div className="flex-1 pt-10 flex gap-6 flex-col">
                    <Button
                        className="w-full flex items-center justify-center gap-2 px-10 font-main py-7 border-red-500 text-red-500"
                        icon={<FcGoogle size={23} />}
                    >
                        Sign in with Google
                    </Button>
                    <Button
                        className="w-full flex items-center justify-center gap-2 px-10 font-main py-7 border-blue-500 text-blue-500"
                        icon={<SiFacebook size={22} />}
                    >
                        Sign in with Facebook
                    </Button>
                    <div className="relative my-5">
                        <div className="h-0 border-black border"></div>
                        <span className="absolute top-[-10px] left-[45%] bg-white px-3">Or</span>
                    </div>

                    <Controller
                        control={control}
                        name="email"
                        rules={{
                            required: 'Email is required',
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Invalid email address',
                            },
                        }}
                        render={({ field }) => (
                            <Flex vertical gap={5}>
                                <Input
                                    size="large"
                                    placeholder="Enter your email"
                                    {...field}
                                    status={errors.email && 'error'}
                                    prefix={
                                        <span className="mr-3">
                                            <FaRegUser size={17} />
                                        </span>
                                    }
                                    className="px-5 py-3"
                                />
                                {errors.email && <span className="font-main text-red-600">{errors.email.message}</span>}
                            </Flex>
                        )}
                    />
                    <Controller
                        control={control}
                        name="password"
                        rules={{
                            required: 'Password is required',
                            minLength: {
                                value: 6,
                                message: 'Password must be at least 6 characters',
                            },
                        }}
                        render={({ field }) => (
                            <Flex vertical gap={5}>
                                <Input.Password
                                    placeholder="Enter your password"
                                    className="px-5 py-3"
                                    {...field}
                                    status={errors.password && 'error'}
                                    prefix={
                                        <span className="mr-3">
                                            <HiOutlineLockClosed size={20} />
                                        </span>
                                    }
                                />
                                {errors.password && (
                                    <span className="font-main text-red-600">{errors.password.message}</span>
                                )}
                            </Flex>
                        )}
                    />

                    <Button
                        type="primary"
                        htmlType="submit"
                        danger
                        className="px-10 font-main py-6 flex justify-center items-center font-semibold text-base mt-10"
                    >
                        Sign In
                    </Button>
                </div>
            </div>
        </form>
    );
};

export default SignIn;