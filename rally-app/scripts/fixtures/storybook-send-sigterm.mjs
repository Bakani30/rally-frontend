process.kill(process.pid, process.env.RALLY_TEST_SIGNAL ?? 'SIGTERM')
